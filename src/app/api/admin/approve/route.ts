export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/config';
import { makeFilePublic, copyToBackupFolder, resolveNestedFolder, moveDriveFile } from '@/lib/drive';
import { getAllFiles, approveFileRecord } from '@/lib/sheets';
import { authorizeAdminRequest } from '@/lib/auth';
import { apiCache } from '@/lib/api-cache';

/**
 * POST /api/admin/approve
 *
 * Approves a quarantined file: resolves its nested path structure, moves it on Drive,
 * sets permissions to public, copies to backup folder, updates Sheets status to approved,
 * and invalidates KV caches.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, driveFileId, adminToken } = body;

    // Verify admin token
    const auth = await authorizeAdminRequest(request, adminToken);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden' },
        { status: auth.status || 403 }
      );
    }

    if (!fileId || !driveFileId) {
      return NextResponse.json(
        { error: 'Missing required fields: fileId, driveFileId' },
        { status: 400 }
      );
    }

    // 1. Get file record from Sheets to obtain metadata
    const allFiles = await getAllFiles();
    const fileRecord = allFiles.find((f) => f.fileId === fileId);

    if (!fileRecord) {
      return NextResponse.json(
        { error: 'File record not found in database registry' },
        { status: 404 }
      );
    }

    const {
      semester,
      courseCode,
      courseName,
      fileType,
      professor,
    } = fileRecord;

    // 2. Resolve target nested path components in Google Drive
    let destinationFolderId = CONFIG.DRIVE_FOLDER_ID;
    try {
      const isAdvance = semester.toUpperCase().includes('ADVANCE');
      const courseCategory = isAdvance ? 'Adv Courses' : 'Core Courses';

      const pathComponents = [courseCategory];
      if (!isAdvance) {
        pathComponents.push(`Sem ${semester}`);
      }
      pathComponents.push(`${courseCode.trim()} ${courseName.trim()}`);

      const FILE_TYPE_FOLDERS: Record<string, string> = {
        qpaper: 'Question Papers',
        notes: 'Notes',
        slides: 'Slides',
        lab: 'Lab Material',
        assignment: 'Assignments',
        other: 'Other',
      };
      const folderName = FILE_TYPE_FOLDERS[fileType.toLowerCase()] || 'Other';
      pathComponents.push(folderName);
      pathComponents.push(professor.trim());

      // Resolve or create nested path in Google Drive
      destinationFolderId = await resolveNestedFolder(CONFIG.DRIVE_FOLDER_ID, pathComponents);
    } catch (err) {
      console.error('[api/admin/approve] Failed to resolve subfolders, using Drive root folder:', err);
    }

    // 3. Move file from quarantine to resolved target folder
    await moveDriveFile(driveFileId, destinationFolderId);

    // 4. Share the file publicly on Google Drive
    await makeFilePublic(driveFileId);

    // 5. Copy file to backup folder if configured
    if (CONFIG.BACKUP_DRIVE_FOLDER_ID) {
      await copyToBackupFolder(driveFileId, CONFIG.BACKUP_DRIVE_FOLDER_ID).catch((err) =>
        console.error('[api/admin/approve] Failed to copy file to backup folder:', err)
      );
    }

    // 6. Update database status to 'approved'
    await approveFileRecord(fileId);

    // 7. Invalidate caches
    const cacheKey = `files:${courseCode}:${semester}`;
    await apiCache.delete(cacheKey).catch(() => {});
    await apiCache.delete('files:all').catch(() => {});
    await apiCache.delete('files:approved:all').catch(() => {});

    return NextResponse.json({ success: true, fileName: fileRecord.fileName });
  } catch (err: any) {
    console.error('[api/admin/approve] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
