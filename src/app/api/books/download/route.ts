export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { appendBookDownloadRecord } from '@/lib/sheets';
import { getAccessToken } from '@/lib/google-auth';

/**
 * GET /api/books/download
 *
 * Logs book access details (bookName, courseCode, semester, driveFileId, userAgent)
 * to a tab in Google Sheets, then streams the file content directly from Google Drive.
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

    // Fetch the file directly from Google Drive using bioarchive007 access token
    const token = await getAccessToken();
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!driveRes.ok) {
      const errorText = await driveRes.text();
      console.error(`[api/books/download] Google Drive download failed:`, errorText);
      return NextResponse.json(
        { error: 'Failed to download file from Google Drive' },
        { status: driveRes.status }
      );
    }

    // Set headers to force direct file download in the browser
    const filename = bookName.endsWith('.pdf') ? bookName : `${bookName}.pdf`;
    const headers = new Headers();
    headers.set('Content-Type', driveRes.headers.get('content-type') || 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Cache-Control', 'public, max-age=3600');

    return new Response(driveRes.body, {
      status: 200,
      headers
    });
  } catch (err: any) {
    console.error('[api/books/download] GET Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

