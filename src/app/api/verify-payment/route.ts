import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Verifies Razorpay payment signature using Web Crypto HMAC-SHA256
 * (fully compatible with Cloudflare Edge runtime and Node.js).
 */
async function verifyHmacSha256(
  data: string,
  secret: string,
  expectedHexSignature: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const generatedSignature = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (generatedSignature.length !== expectedHexSignature.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < generatedSignature.length; i++) {
    mismatch |= generatedSignature.charCodeAt(i) ^ expectedHexSignature.charCodeAt(i);
  }

  return mismatch === 0;
}

/**
 * POST /api/verify-payment
 *
 * Cloudflare Edge Runtime compatible payment verification route.
 * Expected payload:
 * {
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string
 * }
 */
function getEnv(key: string): string | undefined {
  return (
    process.env[key] ||
    (globalThis as any)?.[key] ||
    (globalThis as any)?.__ENV__?.[key] ||
    (globalThis as any)?.env?.[key]
  );
}

export async function POST(request: NextRequest) {
  try {
    const key_secret = getEnv('RAZORPAY_KEY_SECRET');

    if (!key_secret) {
      console.error('[api/verify-payment] Missing RAZORPAY_KEY_SECRET in environment');
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

    const dataToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const isValid = await verifyHmacSha256(dataToSign, key_secret, razorpay_signature);

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
