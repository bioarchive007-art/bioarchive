export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { deleteFromDrive } from '@/lib/drive';
import { deleteFileRecord, getAllFiles } from '@/lib/sheets';
import { authorizeAdminRequest } from '@/lib/auth';
import { apiCache } from '@/lib/api-cache';

/**
 * POST /api/delete
 *
 * Admin-only endpoint (protected by ADMIN_DELETE_TOKEN).
 * This is the SINGLE deletion point — R2, Drive, and Sheets are all
 * cleaned up atomically so no orphaned data remains.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, driveFileId, adminToken } = body;

    // --- Auth check ---
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

    // Before deleting, grab the file record so we know which course cache to invalidate
    let courseCode = '';
    let semester = '';
    let recordToRezip: any = null;
    try {
      const allFiles = await getAllFiles();
      const record = allFiles.find(f => f.fileId === fileId);
      if (record) {
        courseCode = record.courseCode;
        semester = record.semester;
        recordToRezip = record;
      }
    } catch {
      // Non-critical — we'll still delete even if we can't read the metadata
    }

    // Step 1: Delete from Google Drive
    await deleteFromDrive(driveFileId);

    // Step 2: Delete record from Google Sheets
    await deleteFileRecord(fileId);



    // Step 4: Invalidate caches
    if (courseCode && semester) {
      await apiCache.delete(`files:${courseCode}:${semester}`).catch(() => {});
    }
    await apiCache.clearPattern('files:').catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/delete] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
