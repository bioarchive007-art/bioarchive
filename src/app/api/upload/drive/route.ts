export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

/**
 * PUT /api/upload/drive
 *
 * Server-side proxy for uploading file data to a Google Drive resumable session.
 * This avoids CORS issues when the client tries to PUT directly to Google's
 * resumable upload URL. The client sends the file binary body along with
 * the resumable upload URL in a header.
 *
 * Headers expected:
 *   X-Upload-Url: The resumable upload URL from Google Drive
 *   Content-Type: The MIME type of the file
 */
export async function PUT(request: NextRequest) {
  try {
    const uploadUrl = request.headers.get('X-Upload-Url');
    const contentType = request.headers.get('Content-Type') || 'application/octet-stream';

    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'Missing X-Upload-Url header' },
        { status: 400 }
      );
    }

    const contentLength = request.headers.get('content-length');
    const contentRange = request.headers.get('Content-Range');

    if (!request.body) {
      return NextResponse.json(
        { error: 'Empty file body' },
        { status: 400 }
      );
    }

    // Forward the file data stream directly to Google Drive's resumable upload URL
    const driveRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        ...(contentRange ? { 'Content-Range': contentRange } : {}),
      },
      body: request.body,
      // @ts-ignore
      duplex: 'half',
    });

    if (driveRes.status !== 308 && !driveRes.ok) {
      const errorText = await driveRes.text().catch(() => 'Unknown error');
      console.error('[api/upload/drive] Drive upload failed:', driveRes.status, errorText);
      return NextResponse.json(
        { error: `Drive upload failed: ${driveRes.statusText}` },
        { status: driveRes.status }
      );
    }

    if (driveRes.status === 308) {
      const range = driveRes.headers.get('Range') || '';
      return NextResponse.json(
        { status: 308, range },
        { status: 308, headers: { 'Range': range } }
      );
    }

    const driveData = await driveRes.json().catch(() => ({}));

    return NextResponse.json({
      status: driveRes.status,
      id: driveData.id || '',
      webViewLink: driveData.webViewLink || '',
      md5Checksum: driveData.md5Checksum || '',
    });
  } catch (err: any) {
    console.error('[api/upload/drive] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
