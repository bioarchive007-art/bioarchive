import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * POST /api/create-order
 *
 * Cloudflare Edge Runtime compatible order creator using native fetch and Razorpay REST API.
 * Expected payload: { amount: number (in paise), currency?: string, receipt?: string, notes?: object }
 * Minimum amount: 100 paise (₹1)
 */
export async function POST(request: NextRequest) {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      console.error('[api/create-order] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
      return NextResponse.json(
        { error: 'Payment gateway configuration missing.' },
        { status: 500 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON request body.' },
        { status: 400 }
      );
    }

    const { amount, currency = 'INR', receipt, notes } = body || {};

    const amountInPaise = Number(amount);
    if (!amountInPaise || isNaN(amountInPaise) || amountInPaise < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 paise (₹1).' },
        { status: 400 }
      );
    }

    const orderPayload = {
      amount: Math.round(amountInPaise),
      currency: (currency || 'INR').toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: notes || {
        purpose: 'BioArchive Support',
      },
    };

    // Basic Auth for Razorpay REST API (Edge compatible)
    const basicAuth = btoa(`${key_id}:${key_secret}`);

    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const responseData = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      console.error('[api/create-order] Razorpay API error:', responseData);
      return NextResponse.json(
        {
          error:
            responseData?.error?.description ||
            responseData?.error?.message ||
            'Failed to create payment order with Razorpay.',
        },
        { status: razorpayResponse.status }
      );
    }

    return NextResponse.json({
      order_id: responseData.id,
      amount: responseData.amount,
      currency: responseData.currency,
      key_id: key_id,
    });
  } catch (err: any) {
    console.error('[api/create-order] Unexpected error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to create payment order. Please try again.' },
      { status: 500 }
    );
  }
}
