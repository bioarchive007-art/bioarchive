export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getAllRequests, appendRequestRecord, getSiteConfig } from '@/lib/sheets';
import { FileRequest } from '@/types';
import { rateLimit } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { serverError } from '@/lib/errors';

/**
 * GET /api/requests -> Returns requests list
 * POST /api/requests -> Appends a new request
 */
export async function GET(request: NextRequest) {
  try {
    // Rate-limit: 60 per IP per minute (cached, low cost)
    const rl = await rateLimit(request, 'requests-get', 60, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const siteConfig = await getSiteConfig().catch(() => ({ enableFileRequests: true }));
    if (siteConfig.enableFileRequests === false) {
      return NextResponse.json([]);
    }

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
      { error: serverError(err, 'Failed to fetch requests. Please try again.') },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate-limit: 5 requests per IP per 10 minutes to prevent spam submissions.
    const rl = await rateLimit(request, 'requests-post', 5, 600);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const siteConfig = await getSiteConfig().catch(() => ({ enableFileRequests: true }));
    if (siteConfig.enableFileRequests === false) {
      return NextResponse.json({ error: 'Requests are currently disabled by the administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      courseCode,
      courseName,
      semester,
      year,
      fileType,
      uploaderName, // requester
      remarks,
      cfTurnstileToken, // Cloudflare Turnstile challenge token (optional until configured)
    } = body;

    // Verify Turnstile challenge (skipped gracefully if TURNSTILE_SECRET_KEY not yet set)
    const turnstileOk = await verifyTurnstileToken(cfTurnstileToken);
    if (!turnstileOk) {
      return NextResponse.json(
        { error: 'Human verification failed. Please complete the challenge and try again.' },
        { status: 403 }
      );
    }

    if (!courseCode || !semester || !year || !fileType || !uploaderName) {
      return NextResponse.json(
        { error: 'Missing required request parameters' },
        { status: 400 }
      );
    }

    const parsedYear = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    if (isNaN(parsedYear) || !/^\d{4}$/.test(year.toString().trim()) || parsedYear > currentYear) {
      return NextResponse.json(
        { error: `Invalid year. Future years or non-4-digit years are not allowed. (Current year is ${currentYear})` },
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
      { error: serverError(err, 'Failed to submit request. Please try again.') },
      { status: 500 }
    );
  }
}
