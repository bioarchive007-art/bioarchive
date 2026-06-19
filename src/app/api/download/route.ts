export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { incrementDownloadCount, getAllFiles, appendFileDownloadRecord, getSiteConfig } from '@/lib/sheets';
import { verifyGoogleToken } from '@/lib/auth';

/**
 * POST /api/download
 *
 * Increments the download counter for a file record and logs download details.
 * The user's email is extracted from the verified Google ID token (Authorization header),
 * NOT from the request body, to prevent email spoofing in download logs.
 */
export async function POST(request: NextRequest) {
  try {
    const siteConfig: Record<string, boolean> = await getSiteConfig().catch(() => ({ enableDownloads: true }));
    if (siteConfig.enableDownloads === false) {
      return NextResponse.json({ error: 'Downloads are currently disabled by the administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing required field: fileId' },
        { status: 400 }
      );
    }

    // Resolve the user email from the verified token (prevents spoofing).
    // If requireNiserToDownload is on, token is mandatory and we enforce NISER domain.
    let userEmail = 'anonymous';

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (siteConfig.requireNiserToDownload) {
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized: Missing credentials' }, { status: 401 });
      }
      try {
        const googleUser = await verifyGoogleToken(token);
        const isNiser = googleUser.email.toLowerCase().endsWith('@niser.ac.in');
        const isAdmin = googleUser.email.toLowerCase() === 'bioarchive007@gmail.com';
        const isDev = process.env.NODE_ENV === 'development';
        const isAllowed = isNiser || isAdmin || isDev;
        if (!isAllowed) {
          return NextResponse.json({ error: 'Forbidden: Only @niser.ac.in accounts are permitted to download.' }, { status: 403 });
        }
        userEmail = googleUser.email;
      } catch (err: any) {
        return NextResponse.json({ error: `Authentication failed: ${err.message}` }, { status: 401 });
      }
    } else if (token) {
      // Token is optional when restrictions are off, but if provided, use the verified email
      try {
        const googleUser = await verifyGoogleToken(token);
        userEmail = googleUser.email;
      } catch {
        // Token invalid/expired — log as anonymous rather than rejecting
        userEmail = 'anonymous';
      }
    }

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
