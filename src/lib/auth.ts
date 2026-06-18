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
 * Checks if the email is a valid NISER domain email.
 * Allows standard Gmail accounts during local development for testing convenience.
 */
export function isAuthorizedEmail(email: string, isDev = false, customAdminEmails: string[] = []): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();

  
  if (customAdminEmails && customAdminEmails.length > 0) {
    const customList = customAdminEmails.map(e => e.toLowerCase().trim()).filter(Boolean);
    if (customList.includes(normalized)) {
      return true;
    }
  }
  
  // Expose the admin emails to frontend auth validation
  const adminEmailsVal = process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.ADMIN_EMAILS || '';
  const adminEmails = adminEmailsVal.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.includes(normalized)) {
    return true;
  }

  if (isDev) {
    return normalized.endsWith('@niser.ac.in') || normalized.endsWith('@gmail.com');
  }
  return normalized.endsWith('@niser.ac.in');
}

/**
 * Verifies a Google ID token with Google's tokeninfo endpoint.
 * This runs securely in Edge runtimes without external dependencies.
 */
export async function verifyGoogleToken(idToken: string): Promise<GoogleUser> {
  if (!idToken) {
    throw new Error('Google ID token is required');
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
  };

  if (!data.email) {
    throw new Error('Invalid token payload: missing email');
  }

  // Ensure email is verified by Google
  const isVerified = data.email_verified === 'true' || data.email_verified === true;
  if (!isVerified) {
    throw new Error('Google account email is not verified');
  }

  return {
    email: data.email,
    name: data.name || '',
    picture: '',
    verified: true,
  };
}

/**
 * Checks if the given email is a registered administrator.
 */
export function isAdminEmail(email: string): boolean {
  const envVal = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.MOD_EMAILS || '';
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

