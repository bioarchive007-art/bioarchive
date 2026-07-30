export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/config';
import { getAllFiles } from '@/lib/sheets';
import { getDriveFileMetadata, renameDriveFile, moveDriveFile, resolveNestedFolder } from '@/lib/drive';
import { verifyGoogleToken, isAdminEmail } from '@/lib/auth';

/**
 * POST /api/admin/sync-drive
 *
 * Syncs Google Drive file names with Google Sheets file names and moves files into
 * author / professor subfolders on Google Drive.
 *
 * Body parameters:
 * - dryRun?: boolean (default false)
 * - adminToken?: string
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const body = await request.json().catch(() => ({}));
    const { adminToken, dryRun = false } = body;

    const payload = token ? await verifyGoogleToken(token) : null;
    const userEmail = payload?.email || '';
    const isAdmin = isAdminEmail(userEmail);

    const validAdminSecret = process.env.ADMIN_DELETE_TOKEN || process.env.ADMIN_SECRET_TOKEN;
    const isValidToken = !!validAdminSecret && adminToken === validAdminSecret;

    if (!isAdmin && !isValidToken) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const files = await getAllFiles();
    let renamedCount = 0;
    let movedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const logs: string[] = [];

    const FILE_TYPE_FOLDERS: Record<string, string> = {
      qpaper: 'Question Papers',
      notes: 'Notes',
      slides: 'Slides',
      lab: 'Lab Material',
      assignment: 'Assignments',
      other: 'Other',
    };

    for (const file of files) {
      const driveFileId = file.driveFileId?.trim();
      if (!driveFileId) {
        skippedCount++;
        logs.push(`[SKIP] File ID ${file.fileId} (${file.fileName}) - No driveFileId`);
        continue;
      }

      try {
        const meta = await getDriveFileMetadata(driveFileId);

        // 1. Rename check
        let nameChanged = false;
        if (meta.name !== file.fileName) {
          nameChanged = true;
          if (!dryRun) {
            await renameDriveFile(driveFileId, file.fileName);
          }
          renamedCount++;
          logs.push(`[RENAME] Drive File "${meta.name}" -> Sheet Name "${file.fileName}"`);
        }

        // 2. Folder location check & movement
        const isAdvance = String(file.semester || '').toUpperCase().includes('ADVANCE');
        const courseCategory = isAdvance ? 'Adv Courses' : 'Core Courses';

        const pathComponents = [courseCategory];
        if (!isAdvance) {
          pathComponents.push(`Sem ${file.semester}`);
        }
        pathComponents.push(`${file.courseCode.trim()} ${file.courseName.trim()}`);

        const typeFolder = FILE_TYPE_FOLDERS[file.fileType.toLowerCase()] || 'Other';
        pathComponents.push(typeFolder);

        // Subfolder assignment
        if (file.fileType.toLowerCase() === 'notes') {
          let authorFolder = (file.authorName || file.uploaderName || 'Unknown Authors').trim();
          if (file.authorBatch && !authorFolder.includes(file.authorBatch.trim())) {
            authorFolder = `${authorFolder} (${file.authorBatch.trim()})`;
          }
          pathComponents.push(authorFolder);
        } else {
          pathComponents.push((file.professor || 'Other Professors').trim());
        }

        const destFolderId = await resolveNestedFolder(CONFIG.DRIVE_FOLDER_ID, pathComponents);
        const isAlreadyInDest = meta.parents && meta.parents.includes(destFolderId);

        let moved = false;
        if (!isAlreadyInDest) {
          if (!dryRun) {
            await moveDriveFile(driveFileId, destFolderId);
          }
          movedCount++;
          moved = true;
          logs.push(`[MOVE] "${file.fileName}" -> Folder Path: /${pathComponents.join('/')}`);
        }

        if (!nameChanged && !moved) {
          skippedCount++;
        }
      } catch (err: any) {
        errorCount++;
        logs.push(`[ERROR] File ID ${file.fileId} ("${file.fileName}"): ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      dryRun: !!dryRun,
      summary: {
        totalSheetRows: files.length,
        renamedCount,
        movedCount,
        skippedCount,
        errorCount,
      },
      logs,
    });
  } catch (err: any) {
    console.error('[api/admin/sync-drive] Error:', err);
    return NextResponse.json({ error: err.message || 'Sync failed' }, { status: 500 });
  }
}
