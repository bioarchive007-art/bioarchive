export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { incrementDownloadCount } from '@/lib/sheets';

/**
 * POST /api/download
 *
 * Increments the download counter for a file record.
 * The actual file is served directly from R2 public URL on the client side;
 * this endpoint only tracks the analytics.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'Missing required field: fileId' },
        { status: 400 }
      );
    }

    // Fire-and-forget: increment count but don't block the response
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
