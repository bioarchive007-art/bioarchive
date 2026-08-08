export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles, getSiteConfig, appendSearchRecord } from '@/lib/sheets';
import { SheetRow } from '@/types';
import { scoreAndFilterFiles } from '@/lib/search-utils';
import { rateLimit } from '@/lib/rate-limit';
import { serverError } from '@/lib/errors';

/**
 * GET /api/search?q=query
 *
 * Performs a search across all approved files.
 * Uses Cloudflare KV cache for optimized search index lookup.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate-limit: 30 searches per IP per minute.
    // Each cache miss triggers a full Google Sheets read — this protects API quota.
    const rl = await rateLimit(request, 'search', 30, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const siteConfig = await getSiteConfig().catch(() => ({ enableSearch: true }));
    if (siteConfig.enableSearch === false) {
      return NextResponse.json([]);
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';

    if (!q) {
      return NextResponse.json([]);
    }

    const cacheKey = 'files:approved:all';
    let files: SheetRow[] = [];

    // Try Cloudflare KV cache first
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      const cached = await kv.get(cacheKey, { type: 'json' });
      if (cached) {
        files = cached as SheetRow[];
      }
    }

    // Cache miss — fetch from Google Sheets and filter approved entries
    if (!files || files.length === 0) {
      const allFiles = await getAllFiles();
      files = allFiles.filter(f => f.status === 'approved' || !f.status);

      // Cache index for 1 day (or until invalidated on upload/moderation/deletion)
      if (kv && files && files.length > 0) {
        await kv.put(cacheKey, JSON.stringify(files), { expirationTtl: 86400 });
      }
    }

    // Perform smart query matching & relevance scoring
    const approvedFiles = files.filter(f => f.status === 'approved' || !f.status);
    const filtered = scoreAndFilterFiles(approvedFiles, q);
    const results = filtered.slice(0, 50);

    // Silent telemetry: Log search query analytics to Google Sheets (fire-and-forget)
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'Unknown');
    const referrer = request.headers.get('referer') || request.headers.get('referrer') || 'Direct';

    appendSearchRecord({
      query: q,
      resultsCount: results.length,
      userAgent,
      ipAddress,
      referrer,
    }).catch(err => console.error('[api/search] Search logging failed:', err));

    // Return top 50 matches
    return NextResponse.json(results);
  } catch (err: any) {
    console.error('[api/search] Error:', err);
    return NextResponse.json(
      { error: serverError(err, 'Failed to perform search. Please try again.') },
      { status: 500 }
    );
  }
}
