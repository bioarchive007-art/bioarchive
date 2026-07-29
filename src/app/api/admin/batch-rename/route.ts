export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles, updateSheetFileName } from '@/lib/sheets';
import { renameDriveFile } from '@/lib/drive';
import { generateRenamedFilename } from '@/lib/file-renaming';
import { verifyGoogleToken, isAdminEmail } from '@/lib/auth';

/**
 * POST /api/admin/batch-rename
 * Batch renames all files in Google Drive and updates Google Sheet row entries to match new traditional naming scheme.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const body = await request.json().catch(() => ({}));
    const { adminToken } = body;

    const payload = token ? await verifyGoogleToken(token) : null;
    const userEmail = payload?.email || '';
    const isAdmin = isAdminEmail(userEmail);

    const validAdminSecret = process.env.ADMIN_DELETE_TOKEN || process.env.ADMIN_SECRET_TOKEN;
    const isValidToken = !!validAdminSecret && adminToken === validAdminSecret;

    if (!isAdmin && !isValidToken) {
      return NextResponse.json({ error: 'Unauthorized admin access required' }, { status: 403 });
    }

    const files = await getAllFiles();
    let updatedCount = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const newName = generateRenamedFilename(file.fileName, {
          courseCode: file.courseCode,
          professor: file.professor,
          fileType: file.fileType,
          year: file.year,
          examType: file.examType,
        });

        if (newName !== file.fileName) {
          // Rename in Google Drive
          if (file.driveFileId) {
            await renameDriveFile(file.driveFileId, newName).catch((err) => {
              console.warn(`Drive rename warning for ${file.fileId}:`, err.message);
            });
          }

          // Update in Google Sheet
          await updateSheetFileName(file.fileId, newName);
          updatedCount++;
        }
      } catch (err: any) {
        errors.push(`Failed to rename fileId ${file.fileId}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Batch renaming completed. Updated ${updatedCount} files out of ${files.length}.`,
      updatedCount,
      totalFiles: files.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Batch renaming failed' }, { status: 500 });
  }
}
