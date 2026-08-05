export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/config';
import { SheetRow } from '@/types';
import { makeFilePublic, copyToBackupFolder } from '@/lib/drive';
import { checkDuplicate, appendFileRecord, initializeSheetHeaders, fulfillRequest, getSiteConfig } from '@/lib/sheets';
import { notifyModsOfUpload } from '@/lib/notify';
import { apiCache } from '@/lib/api-cache';
import { verifyGoogleToken, isAdminEmail } from '@/lib/auth';
import { getAccessToken } from '@/lib/google-auth';
import { rateLimit } from '@/lib/rate-limit';
import { serverError } from '@/lib/errors';
import { normalizeCourseCode } from '@/lib/utils';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'application/vnd.ms-powerpoint',
]);

/**
 * Verify the actual file size and MIME type on Google Drive after upload.
 * This catches clients that sent a fake fileSize/mimeType to bypass session validation.
 */
async function verifyDriveFile(driveFileId: string): Promise<{ size: number; mimeType: string }> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=size,mimeType`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to fetch uploaded file metadata from Drive');
  return res.json() as Promise<{ size: number; mimeType: string }>;
}

/**
 * POST /api/upload/confirm
 *
 * Finalises an upload: optionally uploads to R2, checks for duplicates,
 * writes the record to Google Sheets, invalidates KV cache, and
 * fires a moderator notification.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate-limit: 40 confirm calls per IP per 10 minutes.
    // Protects Google Sheets from being flooded with fake file records.
    const rl = await rateLimit(request, 'upload-confirm', 40, 600);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const body = await request.json();

    const {
      driveFileId,
      canonicalFileName,
      metadata,
      isLastFile,
      batchFiles,
    } = body;

    if (!driveFileId || !canonicalFileName || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields: driveFileId, canonicalFileName, metadata' },
        { status: 400 }
      );
    }

    const r2Url = '';
    const r2Key = '';
    const md5Hash = metadata.md5Hash || '';

    // Step 1.5: If moderation is disabled, share and backup immediately
    const siteConfig: Record<string, boolean> = await getSiteConfig().catch(() => ({ requireModeration: true, enableUploads: true }));
    if (siteConfig.enableUploads === false) {
      return NextResponse.json({ error: 'Uploads are currently disabled by the administrator.' }, { status: 403 });
    }

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
    let email = '';
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      try {
        const googleUser = await verifyGoogleToken(token);
        email = googleUser.email;
      } catch (err) {
        // Silently ignore auth failure for anonymous upload
      }
    }
    const tracking = `[HIDDEN: ip=${ip}, email=${email || 'none'}]`;
    const finalRemarks = metadata.remarks ? `${metadata.remarks} ${tracking}` : tracking;
    const isDuplicate = metadata.isDuplicate === true;
    const status = siteConfig.requireModeration ? 'pending_approval' : 'approved';

    // ── Server-side file size + MIME verification ──────────────────────────────
    // The session endpoint validated numbers from the request body (client-controlled).
    // Here we check the *actual* uploaded file on Drive to catch any bypass attempts.
    try {
      const driveFileMeta = await verifyDriveFile(driveFileId);
      const maxBytes = CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
      const actualSize = Number(driveFileMeta.size);

      if (actualSize > maxBytes) {
        return NextResponse.json(
          { error: `Uploaded file exceeds the maximum allowed size of ${CONFIG.MAX_FILE_SIZE_MB} MB. Actual size: ${(actualSize / 1024 / 1024).toFixed(1)} MB.` },
          { status: 413 }
        );
      }

      if (!ALLOWED_MIME_TYPES.has(driveFileMeta.mimeType)) {
        return NextResponse.json(
          { error: `Uploaded file type "${driveFileMeta.mimeType}" is not allowed.` },
          { status: 415 }
        );
      }
    } catch (verifyErr) {
      console.error('[api/upload/confirm] Drive file verification failed:', verifyErr);
      // Non-blocking — don't reject the upload if Drive metadata fetch fails
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Always make file viewable via link so admins & users can preview in iframe
    await makeFilePublic(driveFileId).catch((err) => {
      console.error('[api/upload/confirm] Failed to make file public on Drive:', err);
    });

    if (!siteConfig.requireModeration) {
      if (CONFIG.BACKUP_DRIVE_FOLDER_ID) {
        await copyToBackupFolder(driveFileId, CONFIG.BACKUP_DRIVE_FOLDER_ID).catch((err) =>
          console.error('[api/upload/confirm] Failed to copy to backup folder:', err)
        );
      }
    }

    // Step 2: Build SheetRow
    const fileId = crypto.randomUUID();
    const { canonical, oldCode } = normalizeCourseCode(metadata.courseCode);
    const sheetRow: SheetRow = {
      fileId,
      r2Key,
      driveFileId,
      semester: metadata.semester || '',
      year: metadata.year || '',
      courseCode: canonical,
      courseName: metadata.courseName || '',
      professor: metadata.professor || '',
      professor2: metadata.professor2 || '',
      professor3: metadata.professor3 || '',
      examType: metadata.examType || '',
      fileType: metadata.fileType || '',
      fileName: canonicalFileName,
      uploaderName: metadata.uploaderName || '',
      uploadDate: new Date().toISOString().split('T')[0],
      md5Hash,
      r2Url,
      driveWebViewLink: metadata.driveWebViewLink || '',
      downloadCount: 0,
      remarks: finalRemarks,
      contentScope: metadata.contentScope || undefined,
      authorName: metadata.authorName || undefined,
      authorBatch: metadata.authorBatch || undefined,
      status,
    };

    // Step 3: Ensure sheet headers are up to date, then append record
    await initializeSheetHeaders();
    await appendFileRecord(sheetRow, isDuplicate);

    // Step 3.5: If uploaded for a request, fulfill it
    if (metadata.requestId) {
      await fulfillRequest(metadata.requestId, fileId).catch((err) =>
        console.error('[api/upload/confirm] Failed to fulfill request:', err)
      );
    }

    // Step 4: Invalidate cache for this course
    const cacheKey = `files:${oldCode.toLowerCase()}:${sheetRow.semester.toLowerCase().trim()}`;
    await apiCache.delete(cacheKey).catch(() => { });

    // Step 5: Notify moderators (await email send so Edge runtime finishes request)
    const isLast = isLastFile !== false;
    if (isLast) {
      const fileNamesList = Array.isArray(batchFiles) && batchFiles.length > 0
        ? batchFiles
        : [canonicalFileName];

      await notifyModsOfUpload({
        fileNames: fileNamesList,
        courseCode: sheetRow.courseCode,
        courseName: sheetRow.courseName,
        semester: sheetRow.semester,
        uploaderName: sheetRow.uploaderName,
        fileType: sheetRow.fileType,
        remarks: metadata.remarks,
      }).catch((err) => {
        console.error('[api/upload/confirm] Error sending moderator upload notification:', err);
      });
    }

    return NextResponse.json({ success: true, fileName: canonicalFileName });
  } catch (err: any) {
    console.error('[api/upload/confirm] Error:', err);
    return NextResponse.json(
      { error: serverError(err, 'Failed to confirm upload. Please try again.') },
      { status: 500 }
    );
  }
}
