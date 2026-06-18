export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/config';
import { SheetRow } from '@/types';
import { makeFilePublic, copyToBackupFolder } from '@/lib/drive';
import { checkDuplicate, appendFileRecord, initializeSheetHeaders, fulfillRequest, getSiteConfig } from '@/lib/sheets';
import { notifyModsOfUpload } from '@/lib/notify';
import { apiCache } from '@/lib/api-cache';

/**
 * POST /api/upload/confirm
 *
 * Finalises an upload: optionally uploads to R2, checks for duplicates,
 * writes the record to Google Sheets, invalidates KV cache, and
 * fires a moderator notification.
 */
export async function POST(request: NextRequest) {
  try {
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
    const isDuplicate = metadata.isDuplicate === true;
    const status = metadata.status || (siteConfig.requireModeration ? 'pending_approval' : 'approved');

    if (!siteConfig.requireModeration) {
      await makeFilePublic(driveFileId).catch(() => {});
      if (CONFIG.BACKUP_DRIVE_FOLDER_ID) {
        await copyToBackupFolder(driveFileId, CONFIG.BACKUP_DRIVE_FOLDER_ID).catch((err) =>
          console.error('[api/upload/confirm] Failed to copy to backup folder:', err)
        );
      }
    }

    // Step 2: Build SheetRow
    const fileId = crypto.randomUUID();
    const sheetRow: SheetRow = {
      fileId,
      r2Key,
      driveFileId,
      semester: metadata.semester || '',
      year: metadata.year || '',
      courseCode: metadata.courseCode || '',
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
      remarks: metadata.remarks || '',
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
    const cacheKey = `files:${sheetRow.courseCode}:${sheetRow.semester}`;
    await apiCache.delete(cacheKey).catch(() => { });

    // Step 5: Notify moderators (fire-and-forget, only on the last file in the batch)
    if (isLastFile) {
      const fileNamesList = Array.isArray(batchFiles) && batchFiles.length > 0
        ? batchFiles
        : [canonicalFileName];

      notifyModsOfUpload({
        fileNames: fileNamesList,
        courseCode: sheetRow.courseCode,
        courseName: sheetRow.courseName,
        semester: sheetRow.semester,
        uploaderName: sheetRow.uploaderName,
        fileType: sheetRow.fileType,
      }).catch(() => { });
    }

    return NextResponse.json({ success: true, fileName: canonicalFileName });
  } catch (err: any) {
    console.error('[api/upload/confirm] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
