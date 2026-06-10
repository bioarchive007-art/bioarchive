export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAllNotices } from '@/lib/sheets';
import { Notice } from '@/types';

/**
 * GET /api/notices
 *
 * Returns active notices. Uses Cloudflare KV cache with a 5-minute TTL.
 */
export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'notices:all';
    let notices: Notice[] = [];

    // Try Cloudflare KV cache first
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      const cached = await kv.get(cacheKey, { type: 'json' });
      if (cached) {
        notices = cached as Notice[];
      }
    }

    if (!notices || notices.length === 0) {
      notices = await getAllNotices();

      if (kv && notices && notices.length > 0) {
        await kv.put(cacheKey, JSON.stringify(notices), { expirationTtl: 300 });
      }
    }

    // Filter to only return active notices
    const activeNotices = notices.filter(n => n.active);

    return NextResponse.json(activeNotices);
  } catch (err: any) {
    console.error('[api/notices] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
