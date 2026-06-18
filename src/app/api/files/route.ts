export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getFilesByCourse } from '@/lib/sheets';
import { apiCache } from '@/lib/api-cache';

/**
 * GET /api/files?courseCode=XXX&semester=N
 *
 * Returns file records for a given course and semester.
 * Uses Cloudflare KV cache + local memory fallback with 5 days TTL.
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

    // Try cache first
    const cached = await apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Cache miss — fetch from Google Sheets
    const files = await getFilesByCourse(courseCode, semester);

    // Cache the result with 5-day TTL (432000 seconds)
    await apiCache.set(cacheKey, files, 432000);

    return NextResponse.json(files);
  } catch (err: any) {
    console.error('[api/files] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
