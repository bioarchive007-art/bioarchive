export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAllRequests, appendRequestRecord } from '@/lib/sheets';
import { FileRequest } from '@/types';

/**
 * GET /api/requests -> Returns requests list
 * POST /api/requests -> Appends a new request
 */
export async function GET(request: NextRequest) {
  try {
    const cacheKey = 'requests:all';
    let requests: FileRequest[] = [];

    // Try Cloudflare KV cache first
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      const cached = await kv.get(cacheKey, { type: 'json' });
      if (cached) {
        requests = cached as FileRequest[];
      }
    }

    if (!requests || requests.length === 0) {
      requests = await getAllRequests();

      if (kv && requests && requests.length > 0) {
        await kv.put(cacheKey, JSON.stringify(requests), { expirationTtl: 60 }); // Cache for 1 min
      }
    }

    return NextResponse.json(requests);
  } catch (err: any) {
    console.error('[api/requests] GET Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      courseCode,
      courseName,
      semester,
      year,
      fileType,
      uploaderName, // requester
      remarks,
    } = body;

    if (!courseCode || !semester || !year || !fileType || !uploaderName) {
      return NextResponse.json(
        { error: 'Missing required request parameters' },
        { status: 400 }
      );
    }

    const newRequest: FileRequest = {
      requestId: crypto.randomUUID(),
      courseCode: courseCode.trim().toUpperCase(),
      courseName: (courseName || '').trim(),
      semester: semester.toString(),
      year: year.toString(),
      fileType: fileType.toLowerCase(),
      uploaderName: uploaderName.trim(),
      remarks: (remarks || '').trim(),
      requestDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      fulfilledFileId: '',
    };

    // Append to sheets
    await appendRequestRecord(newRequest);

    // Invalidate KV cache
    const kv = (globalThis as any).BIOARCHIVE_CACHE;
    if (kv) {
      await kv.delete('requests:all').catch(() => {});
    }

    return NextResponse.json({ success: true, request: newRequest });
  } catch (err: any) {
    console.error('[api/requests] POST Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
