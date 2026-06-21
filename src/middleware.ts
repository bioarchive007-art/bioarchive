import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Decodes the payload of a JWT client-side / edge-side without cryptographic verification.
 * Also checks the `exp` claim — returns null for expired tokens.
 */
function decodeJWT(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // atob is available globally in Next.js edge/middleware environments
    const decoded = atob(base64);
    const jsonStr = decodeURIComponent(
      decoded
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonStr);

    // Reject expired tokens — Google ID tokens expire after 1 hour
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export function middleware(request: NextRequest) {
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

    const payload = decodeJWT(token);
    if (!payload || !payload.email) {
      return blockRequest();
    }

    const email = payload.email.toLowerCase().trim();
    // NEXT_PUBLIC_ADMIN_EMAILS excluded: it would leak admin emails into the browser bundle.
    const envVal = process.env.ADMIN_EMAILS || process.env.MOD_EMAILS || '';
    const adminEmails = envVal.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

    // Grant access to both configured admins and the master bioarchive007@gmail.com account
    if (email !== 'bioarchive007@gmail.com' && !adminEmails.includes(email)) {
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
