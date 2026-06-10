export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getFilesByCourse } from '@/lib/sheets';

/**
 * GET /api/files?courseCode=XXX&semester=N
 *
 * Returns file records for a given course and semester.
 * Uses Cloudflare KV cache with a 5-minute TTL.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get('courseCode');
    const semester = searchParams.get('semester');

    if (!courseCode || !semester) {
      return NextResponse.json(
        { error: 'Missing required query parameters: courseCode and semester' },
        { status: 400 }
      );
    }

    const cacheKey = `files:${courseCode}:${semester}`;

    // Try Cloudflare KV cache first (available via global binding in Workers context)
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      const cached = await kv.get(cacheKey, { type: 'json' });
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Cache miss — fetch from Google Sheets
    const files = await getFilesByCourse(courseCode, semester);

    // Cache the result with 5-minute TTL
    if (kv) {
      await kv.put(cacheKey, JSON.stringify(files), { expirationTtl: 300 });
    }

    return NextResponse.json(files);
  } catch (err: any) {
    console.error('[api/files] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
