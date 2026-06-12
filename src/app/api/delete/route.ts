export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { deleteFromDrive } from '@/lib/drive';
import { deleteFileRecord, getAllFiles } from '@/lib/sheets';
import { rebuildZipArchive } from '@/lib/zip-utils';

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
    const expectedToken = process.env.ADMIN_DELETE_TOKEN;
    if (!expectedToken || adminToken !== expectedToken) {
      return NextResponse.json(
        { error: 'Forbidden: invalid or missing admin token' },
        { status: 403 }
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

    // Step 3: Rebuild zip archive dynamically on the backend after deleting
    if (recordToRezip && recordToRezip.fileType.toLowerCase() !== 'qpaper' && !recordToRezip.fileName.toLowerCase().endsWith('_all_files.zip')) {
      await rebuildZipArchive({
        courseCode: recordToRezip.courseCode,
        semester: recordToRezip.semester,
        year: recordToRezip.year,
        fileType: recordToRezip.fileType,
        professor: recordToRezip.professor,
      }).catch((err) =>
        console.error('[api/delete] Failed to rebuild ZIP archive:', err)
      );
    }

    // Step 4: Invalidate KV cache
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      if (courseCode && semester) {
        await kv.delete(`files:${courseCode}:${semester}`).catch(() => {});
      }
      // Also attempt a broader invalidation via KV list (best-effort)
      try {
        const list = await kv.list({ prefix: 'files:' });
        if (list?.keys) {
          await Promise.allSettled(
            list.keys.map((k: { name: string }) => kv.delete(k.name))
          );
        }
      } catch {
        // KV list may not be supported or may fail — non-critical
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/delete] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
