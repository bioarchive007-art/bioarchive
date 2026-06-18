export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { appendLoginRecord } from '@/lib/sheets';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name' },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Log login event to Google Sheets
    await appendLoginRecord({ email, name, userAgent });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/auth/login-log] Logging failed:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
