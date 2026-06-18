export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles } from '@/lib/sheets';
import { authorizeAdminRequest } from '@/lib/auth';

/**
 * POST /api/admin/list
 *
 * Retrieves all file records (approved and pending) from Google Sheets, protected by the admin token.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminToken } = body;

    const auth = await authorizeAdminRequest(request, adminToken);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || 'Forbidden' },
        { status: auth.status || 403 }
      );
    }

    // Fetch all files from Sheets (bypassing public filtering)
    const files = await getAllFiles();

    // Sort by upload date descending
    files.sort((a, b) => {
      const dateA = new Date(a.uploadDate || 0).getTime();
      const dateB = new Date(b.uploadDate || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json(files);
  } catch (err: any) {
    console.error('[api/admin/list] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
