export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig, updateSiteConfig } from '@/lib/sheets';
import { verifyGoogleToken } from '@/lib/auth';

function getAdminEmails(): string[] {
  const envVal = process.env.ADMIN_EMAILS || process.env.MOD_EMAILS || '';
  return envVal
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing credentials' }, { status: 401 });
    }

    // 1. Verify Google SSO ID Token
    const user = await verifyGoogleToken(token);
    const adminEmails = getAdminEmails();

    if (!adminEmails.includes(user.email.toLowerCase())) {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const { adminToken, config } = body;

    // 2. Verify admin token password
    if (adminToken !== process.env.ADMIN_DELETE_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized: Invalid admin password' }, { status: 401 });
    }

    if (!config) {
      return NextResponse.json({ error: 'Missing config object' }, { status: 400 });
    }

    await updateSiteConfig(config);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/admin/config] POST Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const config = await getSiteConfig();
    return NextResponse.json(config);
  } catch (err: any) {
    console.error('[api/admin/config] GET Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
