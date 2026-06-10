export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAllFiles } from '@/lib/sheets';
import { SheetRow } from '@/types';

/**
 * GET /api/search?q=query
 *
 * Performs a search across all files in the Google Sheet.
 * Uses Cloudflare KV cache with a 5-minute TTL to store all files.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim().toLowerCase() || '';

    if (!q) {
      return NextResponse.json([]);
    }

    const cacheKey = 'files:all';
    let files: SheetRow[] = [];

    // Try Cloudflare KV cache first
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      const cached = await kv.get(cacheKey, { type: 'json' });
      if (cached) {
        files = cached as SheetRow[];
      }
    }

    // Cache miss — fetch from Google Sheets
    if (!files || files.length === 0) {
      files = await getAllFiles();

      // Cache all files for 5 minutes
      if (kv && files && files.length > 0) {
        await kv.put(cacheKey, JSON.stringify(files), { expirationTtl: 300 });
      }
    }

    // Perform query matching
    const searchTerms = q.split(/\s+/).filter(Boolean);
    const filtered = files.filter((file) => {
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
