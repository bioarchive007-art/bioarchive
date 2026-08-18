import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export const runtime = 'nodejs';

/**
 * POST /api/create-order
 *
 * Creates a new Razorpay order.
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

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const orderOptions = {
      amount: Math.round(amountInPaise),
      currency: (currency || 'INR').toUpperCase(),
      receipt: receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      notes: notes || {
        purpose: 'BioArchive Support',
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    return NextResponse.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: key_id,
    });
  } catch (err: any) {
    console.error('[api/create-order] Razorpay order creation failed:', err);
    const errorMessage =
      err?.error?.description ||
      err?.message ||
      'Failed to create payment order. Please try again.';
    const statusCode = err?.statusCode || 500;
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
