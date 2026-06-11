export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { appendBookDownloadRecord } from '@/lib/sheets';

/**
 * GET /api/books/download
 *
 * Logs book access details (bookName, courseCode, semester, driveFileId, userAgent)
 * to a tab in Google Sheets, then redirects to the Google Drive preview link.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId') || '';
    const bookName = searchParams.get('bookName') || '';
    const courseCode = searchParams.get('courseCode') || '';
    const semester = searchParams.get('semester') || '';

    if (!fileId || !bookName) {
      return NextResponse.json(
        { error: 'Missing required parameters: fileId, bookName' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Log the download event to the sheet (Option B - without logging IP addresses)
    try {
      await appendBookDownloadRecord({
        bookName,
        courseCode,
        semester,
        driveFileId: fileId,
        userAgent,
      });
    } catch (sheetErr) {
      // Non-blocking log failure - make sure user still gets their download even if logging has a glitch
      console.error('Failed to log book download to Google Sheet:', sheetErr);
    }

    // Redirect user to the Google Drive file preview/view page
    const redirectUrl = `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;
    return NextResponse.redirect(redirectUrl);
  } catch (err: any) {
    console.error('[api/books/download] GET Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
