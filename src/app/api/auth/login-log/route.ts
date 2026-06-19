export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { appendLoginRecord } from '@/lib/sheets';
import { verifyGoogleToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate-limit: max 10 login-log calls per IP per 60 seconds
    const rl = await rateLimit(request, 'login-log', 10, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    // Verify the Google ID token — email must come from the verified token,
    // not the request body, to prevent log spoofing.
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing credentials' }, { status: 401 });
    }

    let verifiedEmail: string;
    let verifiedName: string;

    try {
      const googleUser = await verifyGoogleToken(token);
      verifiedEmail = googleUser.email;
      verifiedName = googleUser.name;
    } catch (err: any) {
      return NextResponse.json({ error: `Authentication failed: ${err.message}` }, { status: 401 });
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Log login event to Google Sheets using verified data only
    await appendLoginRecord({ email: verifiedEmail, name: verifiedName, userAgent });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/auth/login-log] Logging failed:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
