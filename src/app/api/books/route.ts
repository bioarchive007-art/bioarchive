export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { findSubfolderId, listFilesInFolder } from '@/lib/drive';

/**
 * GET /api/books
 *
 * Lists all textbook files in the Google Drive folder matching the given semester.
 * Results are cached in Cloudflare KV for 5 minutes.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const semester = searchParams.get('semester') || '';

    if (!semester) {
      return NextResponse.json(
        { error: 'Missing required query parameter: semester' },
        { status: 400 }
      );
    }

    const booksDriveFolderId = process.env.BOOKS_DRIVE_FOLDER_ID;
    if (!booksDriveFolderId) {
      // If books folder ID is not configured yet, return empty list instead of crashing
      console.warn('BOOKS_DRIVE_FOLDER_ID is not configured in environment variables.');
      return NextResponse.json([]);
    }

    const cacheKey = `books:${semester}`;
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    
    // Check KV cache
    if (kv) {
      const cached = await kv.get(cacheKey, { type: 'json' });
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    let targetFolderId = booksDriveFolderId;

    // Search for a semester subfolder (e.g. "1", "2", "ADVANCE COURSES")
    try {
      const subfolderId = await findSubfolderId(booksDriveFolderId, semester);
      if (subfolderId) {
        targetFolderId = subfolderId;
      } else {
        console.info(`No subfolder found matching semester "${semester}". Falling back to parent folder.`);
      }
    } catch (err) {
      console.error('Failed to search for semester subfolder:', err);
    }

    // List files inside the determined folder
    const files = await listFilesInFolder(targetFolderId);

    // Save to KV cache
    if (kv && files && files.length > 0) {
      await kv.put(cacheKey, JSON.stringify(files), { expirationTtl: 300 }); // Cache for 5 minutes
    }

    return NextResponse.json(files);
  } catch (err: any) {
    console.error('[api/books] GET Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
