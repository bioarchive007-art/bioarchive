import { NextRequest, NextResponse } from 'next/server';
import { incrementDownloadCount, getAllFiles, appendFileDownloadRecord, getSiteConfig } from '@/lib/sheets';

/**
 * POST /api/download
 *
 * Increments the download counter for a file record and logs download details with the user's email.
 */
export async function POST(request: NextRequest) {
  try {
    const siteConfig: Record<string, boolean> = await getSiteConfig().catch(() => ({ enableDownloads: true }));
    if (siteConfig.enableDownloads === false) {
      return NextResponse.json({ error: 'Downloads are currently disabled by the administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const { fileId, email } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing required field: fileId' },
        { status: 400 }
      );
    }

    const userEmail = email || 'unknown@niser.ac.in';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Log the download details (fire-and-forget/non-blocking)
    getAllFiles()
      .then((allFiles) => {
        const record = allFiles.find((f) => f.fileId === fileId);
        if (record) {
          return appendFileDownloadRecord({
            fileName: record.fileName,
            courseCode: record.courseCode,
            semester: record.semester,
            fileId: record.fileId,
            uploaderName: record.uploaderName || 'Anonymous',
            userEmail,
            userAgent,
          });
        }
      })
      .catch((err) => console.error('[api/download] Logging failed:', err));

    // Increment count (fire-and-forget)
    incrementDownloadCount(fileId).catch((err) =>
      console.error('[api/download] Failed to increment download count:', err)
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/download] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
