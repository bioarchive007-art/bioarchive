export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/sheets';
import { getAccessToken } from '@/lib/google-auth';
import { verifyGoogleToken, isAdminEmail } from '@/lib/auth';
import { fetchWithTimeout } from '@/lib/utils';
import { serverError } from '@/lib/errors';

// Shadow global fetch with our custom timeout wrapper
const fetch = fetchWithTimeout;

/**
 * GET /api/books/download
 *
 * Logs book access details (bookName, courseCode, semester, driveFileId, userAgent)
 * to a tab in Google Sheets, then streams the file content directly from Google Drive.
 */
export async function GET(request: NextRequest) {
  try {
    const siteConfig: Record<string, boolean> = await getSiteConfig().catch(() => ({ enableDownloads: true }));
    if (siteConfig.enableDownloads === false) {
      return NextResponse.json({ error: 'Downloads are currently disabled by the administrator.' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const fileId = searchParams.get('fileId') || '';
    const bookName = searchParams.get('bookName') || '';
    const courseCode = searchParams.get('courseCode') || '';
    const semester = searchParams.get('semester') || '';
    
    let email = 'unknown@niser.ac.in';

    // Verify user if requireNiserToDownload is active
    if (siteConfig.requireNiserToDownload) {
      const tokenParam = searchParams.get('token') || '';
      if (!tokenParam) {
        return NextResponse.json({ error: 'Unauthorized: Missing credentials token' }, { status: 401 });
      }
      try {
        const googleUser = await verifyGoogleToken(tokenParam);
        email = googleUser.email;
        const isNiser = email.toLowerCase().endsWith('@niser.ac.in');
        const isAdmin = isAdminEmail(email);
        const isDev = process.env.NODE_ENV === 'development';
        const isAllowed = isNiser || isAdmin || (isDev && email.toLowerCase().endsWith('@gmail.com'));

        if (!isAllowed) {
          return NextResponse.json({ error: 'Forbidden: Only @niser.ac.in accounts are permitted to download reference books.' }, { status: 403 });
        }
      } catch (err: any) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
      }
    } else {
      // Parse token if present for log tracking, otherwise fallback to query email or default
      const tokenParam = searchParams.get('token') || '';
      if (tokenParam) {
        try {
          const googleUser = await verifyGoogleToken(tokenParam);
          email = googleUser.email;
        } catch {
          // ignore
        }
      } else {
        const emailParam = searchParams.get('email');
        if (emailParam) {
          email = emailParam;
        }
      }
    }

    if (!fileId || !bookName) {
      return NextResponse.json(
        { error: 'Missing required parameters: fileId, bookName' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Note: Direct book download logging removed; book access is now tracked via the Request system.

    // Fetch the file directly from Google Drive using administrator access token
    const token = await getAccessToken();
    const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` }
    }, null); // Disable timeout for file streaming download

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
      { error: serverError(err, 'Failed to download textbook. Please try again.') },
      { status: 500 }
    );
  }
}

