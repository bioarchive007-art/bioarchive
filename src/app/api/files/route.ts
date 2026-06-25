export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getFilesByCourse } from '@/lib/sheets';
import { apiCache } from '@/lib/api-cache';
import { rateLimit } from '@/lib/rate-limit';
import { serverError } from '@/lib/errors';
import { normalizeCourseCode } from '@/lib/utils';

/**
 * GET /api/files?courseCode=XXX&semester=N
 *
 * Returns file records for a given course and semester.
 * Uses Cloudflare KV cache + local memory fallback with 5 days TTL.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate-limit: 60 file list requests per IP per minute.
    // Cache misses hit Google Sheets — this guards against cache-busting attacks.
    const rl = await rateLimit(request, 'files', 60, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get('courseCode');
    const semester = searchParams.get('semester');

    if (!courseCode || !semester) {
      return NextResponse.json(
        { error: 'Missing required query parameters: courseCode and semester' },
        { status: 400 }
      );
    }

    const { oldCode } = normalizeCourseCode(courseCode);
    const cacheKey = `files:${oldCode.toLowerCase()}:${semester.toLowerCase().trim()}`;

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
      { error: serverError(err, 'Failed to retrieve files. Please try again.') },
      { status: 500 }
    );
  }
}
