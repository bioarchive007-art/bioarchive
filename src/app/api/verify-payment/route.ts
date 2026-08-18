import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/verify-payment
 *
 * Verifies the Razorpay payment signature using HMAC SHA-256.
 * Expected payload:
 * {
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_secret) {
      console.error('[api/verify-payment] Missing RAZORPAY_KEY_SECRET');
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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        {
          error:
            'Missing required payment verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature).',
        },
        { status: 400 }
      );
    }

    // Generate expected HMAC-SHA256 signature
    const dataToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(dataToSign)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf-8');

    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isValid) {
      console.warn(
        `[api/verify-payment] Signature mismatch for order: ${razorpay_order_id}, payment: ${razorpay_payment_id}`
      );
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature. Verification failed.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment signature verified successfully.',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
    });
  } catch (err: any) {
    console.error('[api/verify-payment] Unexpected verification error:', err);
    return NextResponse.json(
      { success: false, error: 'Internal error during payment verification.' },
      { status: 500 }
    );
  }
}
