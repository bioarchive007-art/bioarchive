export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getBookRequestsByEmail } from '@/lib/sheets';
import { verifyGoogleToken, checkIsDev } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token = searchParams.get('token') || '';

  if (!token) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  try {
    const googleUser = await verifyGoogleToken(token);
    const email = googleUser.email;

    const isDev = checkIsDev() || request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
    const isNiser = email.toLowerCase().endsWith('@niser.ac.in');
    const isGmail = email.toLowerCase().endsWith('@gmail.com');
    const isBioarchive = email.toLowerCase() === 'bioarchive007@gmail.com' || email.toLowerCase().startsWith('bioarchive007@');
    if (!isNiser && !isBioarchive && !(isDev && isGmail)) {
      return NextResponse.json({ error: 'Only @niser.ac.in accounts can access book requests.' }, { status: 403 });
    }

    const requests = await getBookRequestsByEmail(email);

    // Filter out expired books from 'Allowed' state (mark them as Expired in response)
    const now = new Date();
    const enriched = requests.map(req => {
      if (req.status === 'Allowed' && req.expiresAt && new Date(req.expiresAt) < now) {
        return { ...req, status: 'Expired' };
      }
      return req;
    });

    // Sort: newest first by timestamp
    enriched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(enriched);
  } catch (err: any) {
    console.error('[api/books/my-requests] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch book requests.' }, { status: 500 });
  }
}
