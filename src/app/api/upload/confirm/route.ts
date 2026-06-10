export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/config';
import { SheetRow } from '@/types';
import { makeFilePublic, copyToBackupFolder } from '@/lib/drive';
import { checkDuplicate, appendFileRecord, initializeSheetHeaders, fulfillRequest } from '@/lib/sheets';
import { notifyModsOfUpload } from '@/lib/notify';

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

    // Step 1.5: Share the file so anyone/domain can view/download
    await makeFilePublic(driveFileId);

    // Step 1.6: Copy to backup folder if configured and file is not a duplicate
    const isDuplicate = metadata.isDuplicate === true;
    if (!isDuplicate && CONFIG.BACKUP_DRIVE_FOLDER_ID) {
      await copyToBackupFolder(driveFileId, CONFIG.BACKUP_DRIVE_FOLDER_ID).catch((err) =>
        console.error('[api/upload/confirm] Failed to copy file to backup folder:', err)
      );
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

    // Step 4: Invalidate KV cache for this course
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      const cacheKey = `files:${sheetRow.courseCode}:${sheetRow.semester}`;
      await kv.delete(cacheKey).catch(() => { });
    }

    // Step 5: Notify moderators (fire-and-forget)
    notifyModsOfUpload({
      fileName: canonicalFileName,
      courseCode: sheetRow.courseCode,
      courseName: sheetRow.courseName,
      semester: sheetRow.semester,
      uploaderName: sheetRow.uploaderName,
      fileType: sheetRow.fileType,
    }).catch(() => { });

    return NextResponse.json({ success: true, fileName: canonicalFileName });
  } catch (err: any) {
    console.error('[api/upload/confirm] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
