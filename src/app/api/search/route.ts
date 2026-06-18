export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles, getSiteConfig } from '@/lib/sheets';
import { SheetRow } from '@/types';

/**
 * GET /api/search?q=query
 *
 * Performs a search across all approved files.
 * Uses Cloudflare KV cache for optimized search index lookup.
 */
export async function GET(request: NextRequest) {
  try {
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

    // Perform query matching
    const searchTerms = q.split(/\s+/).filter(Boolean);
    const filtered = files.filter((file) => {
      // Exclude files that are not approved (backup check)
      if (file.status && file.status !== 'approved') return false;

      const fileName = (file.fileName || '').toLowerCase();
      const courseCode = (file.courseCode || '').toLowerCase();
      const courseName = (file.courseName || '').toLowerCase();
      const professor = (file.professor || '').toLowerCase();
      const uploaderName = (file.uploaderName || '').toLowerCase();
      const year = (file.year || '').toLowerCase();
      const examType = (file.examType || '').toLowerCase();
      const remarks = (file.remarks || '').toLowerCase();

      // Check if all search terms are found in at least one metadata field
      return searchTerms.every(
        (term) =>
          fileName.includes(term) ||
          courseCode.includes(term) ||
          courseName.includes(term) ||
          professor.includes(term) ||
          uploaderName.includes(term) ||
          year.includes(term) ||
          examType.includes(term) ||
          remarks.includes(term)
      );
    });

    // Return top 20 matches
    return NextResponse.json(filtered.slice(0, 20));
  } catch (err: any) {
    console.error('[api/search] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
