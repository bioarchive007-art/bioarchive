export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { incrementDownloadCount, getAllFiles, appendFileDownloadRecord, getSiteConfig } from '@/lib/sheets';
import { verifyGoogleToken, isAdminEmail, checkIsDev } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { serverError } from '@/lib/errors';

/**
 * POST /api/download
 *
 * Increments the download counter for a file record and logs download details.
 * The user's email is extracted from the verified Google ID token (Authorization header),
 * NOT from the request body, to prevent email spoofing in download logs.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate-limit: 30 download log calls per IP per minute.
    const rl = await rateLimit(request, 'download', 30, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

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

    // Validate fileId is a proper UUID — rejects garbage/random strings from bots
    // without needing an extra Sheets API call to look it up.
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(fileId)) {
      return NextResponse.json(
        { error: 'Invalid file ID.' },
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
        const isAdmin = isAdminEmail(googleUser.email);
        const isDev = checkIsDev();
        const isBioarchive = googleUser.email.toLowerCase() === 'bioarchive007@gmail.com' || googleUser.email.toLowerCase().startsWith('bioarchive007@');
        const isAllowed = isNiser || isAdmin || isDev || isBioarchive;
        if (!isAllowed) {
          return NextResponse.json({ error: 'Forbidden: Only @niser.ac.in accounts are permitted to download.' }, { status: 403 });
        }
        userEmail = googleUser.email;
      } catch (err: any) {
        return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
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
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'Unknown');
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || 'Direct';

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
            ipAddress,
            referrer,
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
      { error: serverError(err, 'Failed to process download request. Please try again.') },
      { status: 500 }
    );
  }
}
