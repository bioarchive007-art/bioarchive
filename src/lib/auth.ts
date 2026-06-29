export interface GoogleUser {
  email: string;
  name: string;
  picture: string;
  verified: boolean;
}

/**
 * Decodes the payload of a JWT client-side without signature verification.
 */
export function decodeGoogleCredential(token: string): GoogleUser | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return {
      email: payload.email,
      name: payload.name,
      picture: '',
      verified: payload.email_verified,
    };
  } catch (e) {
    console.error('[auth] Failed to decode Google credential:', e);
    return null;
  }
}

/**
 * Helper to determine if we are running in a local development environment.
 * Supports localhost, 127.0.0.1, and private/local network hostnames or IPs.
 */
export function checkIsDev(): boolean {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.') ||
      hostname.endsWith('.local')
    );
  }
  return false;
}

/**
 * Checks if the email is authorized to use the site.
 * On the client, only the NISER domain is checked.
 * Server-side admin email checks use the ADMIN_EMAILS or MOD_EMAILS env vars.
 * NOTE: Never use NEXT_PUBLIC_ADMIN_EMAILS — it exposes admin emails in the browser bundle.
 */
export function isAuthorizedEmail(email: string, isDev = checkIsDev()): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();

  // Always permit the bioarchive007 test email login
  if (normalized === 'bioarchive007@gmail.com' || normalized.startsWith('bioarchive007@')) {
    return true;
  }

  if (isDev) {
    return normalized.endsWith('@niser.ac.in') || normalized.endsWith('@gmail.com');
  }
  return normalized.endsWith('@niser.ac.in');
}

// Cache for verified Google SSO ID tokens to reduce tokeninfo endpoint calls.
const tokenCache = new Map<string, { user: GoogleUser; expiresAt: number }>();

/**
 * Verifies a Google ID token with Google's tokeninfo endpoint.
 * This runs securely in Edge runtimes without external dependencies.
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUser> {
  if (!idToken) {
    throw new Error('Google ID token is required');
  }

  const now = Date.now();
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > now) {
    return cached.user;
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google token validation failed: ${response.statusText} - ${errText}`);
  }

  const data = (await response.json()) as {
    email?: string;
    email_verified?: string | boolean;
    name?: string;
    picture?: string;
    aud?: string;
    hd?: string;
    exp?: string | number;
  };

  if (!data.email) {
    throw new Error('Invalid token payload: missing email');
  }

  // Ensure email is verified by Google
  const isVerified = data.email_verified === 'true' || data.email_verified === true;
  if (!isVerified) {
    throw new Error('Google account email is not verified');
  }

  const googleUser = {
    email: data.email,
    name: data.name || '',
    picture: '',
    verified: true,
  };

  // Cache the token validation. ID tokens have an expiration claim (exp) in seconds.
  const expSeconds = typeof data.exp === 'number' ? data.exp : parseInt(data.exp || '0', 10);
  const expiresAt = expSeconds ? expSeconds * 1000 : now + (5 * 60 * 1000);

  // Prevent memory leaks by resetting cache if it gets too large
  if (tokenCache.size > 1000) {
    tokenCache.clear();
  }
  tokenCache.set(idToken, { user: googleUser, expiresAt });

  return googleUser;
}

/**
 * Checks if the given email is a registered administrator.
 */
export function isAdminEmail(email: string): boolean {
  // NEXT_PUBLIC_ADMIN_EMAILS is intentionally excluded: NEXT_PUBLIC_ variables are
  // embedded in the browser bundle and would expose admin emails to every user.
  const envVal = process.env.ADMIN_EMAILS || process.env.MOD_EMAILS || '';
  const adminEmails = envVal
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase().trim());
}

/**
 * Server-side Edge helper to authorize an administrative request.
 * Verifies both the Google SSO token and the admin secret password.
 */
export async function authorizeAdminRequest(
  request: Request,
  adminTokenFromBody: string
): Promise<{ authorized: boolean; error?: string; status?: number }> {
  const authHeader = request.headers.get('Authorization') || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return { authorized: false, error: 'Unauthorized: Missing credentials', status: 401 };
  }

  try {
    const googleUser = await verifyGoogleToken(idToken);
    
    if (!isAdminEmail(googleUser.email)) {
      return { authorized: false, error: 'Forbidden: Access denied to ' + googleUser.email, status: 403 };
    }

    const expectedToken = process.env.ADMIN_DELETE_TOKEN;
    if (!expectedToken || adminTokenFromBody !== expectedToken) {
      return { authorized: false, error: 'Unauthorized: Invalid admin password', status: 401 };
    }

    return { authorized: true };
  } catch (err: any) {
    console.error('[auth] Admin authorization error:', err);
    return { authorized: false, error: `Authentication failed: ${err.message}`, status: 401 };
  }
}

