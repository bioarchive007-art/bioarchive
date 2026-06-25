import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

interface JwkCert {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

let cachedKeys: Record<string, JwkCert> | null = null;
let keysExpiry = 0;

async function fetchGoogleKeys(): Promise<Record<string, JwkCert>> {
  const now = Date.now();
  if (cachedKeys && now < keysExpiry) {
    return cachedKeys;
  }
  
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) {
    throw new Error('Failed to fetch Google public keys');
  }
  const data = await res.json() as { keys: JwkCert[] };
  const keysMap: Record<string, JwkCert> = {};
  for (const key of data.keys) {
    keysMap[key.kid] = key;
  }
  cachedKeys = keysMap;
  // Cache keys for 6 hours
  keysExpiry = now + 6 * 60 * 60 * 1000;
  return keysMap;
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    buffer[i] = binary.charCodeAt(i);
  }
  return buffer.buffer;
}

function stringToBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

/**
 * Decodes the payload of a JWT and verifies its cryptographic signature using Google JWKS.
 * Also checks the `exp` and `iss` claims.
 */
async function verifyGoogleJWT(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Decode header
    const headerStr = atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'));
    const header = JSON.parse(headerStr);
    
    // Decode payload
    const payloadStr = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadStr);
    
    // 1. Verify expiry (exp)
    const nowSecs = Math.floor(Date.now() / 1000);
    if (payload.exp && nowSecs > payload.exp) {
      console.warn('[middleware] Token expired');
      return null;
    }
    
    // 2. Verify issuer (iss)
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
      console.warn('[middleware] Invalid issuer:', payload.iss);
      return null;
    }
    
    // 3. Verify signature using JWKS
    const kid = header.kid;
    if (!kid) {
      console.warn('[middleware] Missing kid in JWT header');
      return null;
    }
    
    const keys = await fetchGoogleKeys();
    const jwk = keys[kid];
    if (!jwk) {
      console.warn('[middleware] Key id not found in Google JWKS:', kid);
      return null;
    }
    
    // Import JWK
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: { name: 'SHA-256' },
      },
      false,
      ['verify']
    );
    
    // Verify signature
    const signatureBuffer = base64UrlToBuffer(signatureB64);
    const dataBuffer = stringToBuffer(`${headerB64}.${payloadB64}`);
    
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBuffer,
      dataBuffer
    );
    
    if (!isValid) {
      console.warn('[middleware] Invalid token signature');
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error('[middleware] Token verification failed:', err);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Protect Admin Routes
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin')) {
    const isApi = pathname.startsWith('/api/');
    
    const blockRequest = () => {
      if (isApi) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.rewrite(new URL('/404', request.url));
    };

    const token = request.cookies.get('bioarchive_token')?.value;
    if (!token) {
      return blockRequest();
    }

    const payload = await verifyGoogleJWT(token);
    if (!payload || !payload.email) {
      return blockRequest();
    }

    const email = payload.email.toLowerCase().trim();
    // NEXT_PUBLIC_ADMIN_EMAILS excluded: it would leak admin emails into the browser bundle.
    const envVal = process.env.ADMIN_EMAILS || process.env.MOD_EMAILS || '';
    const adminEmails = envVal.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

    // Grant access only to configured admins
    if (!adminEmails.includes(email)) {
      return blockRequest();
    }
  }

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Pass through to the route handler with CORS headers
  const response = NextResponse.next();
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/:path*'],
};
