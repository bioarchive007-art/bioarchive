/**
 * Cloudflare Turnstile human verification helper.
 *
 * This verifies the challenge token returned by the Turnstile widget on the client
 * by calling Cloudflare's siteverify endpoint from the edge.
 *
 * SETUP (one-time, in Cloudflare Dashboard):
 *   1. Go to Cloudflare Dashboard → Turnstile → Add site
 *   2. Copy the Site Key  → add as NEXT_PUBLIC_TURNSTILE_SITE_KEY (env var)
 *   3. Copy the Secret Key → add as TURNSTILE_SECRET_KEY (Cloudflare Pages secret)
 *
 * GRACEFUL DEGRADATION:
 *   If TURNSTILE_SECRET_KEY is not set, verification is skipped (returns true).
 *   This means the app works identically to before until Turnstile is configured.
 *   Turnstile activates automatically once both env vars are set.
 */

export async function verifyTurnstileToken(
  token: string | null | undefined
): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Turnstile not configured — skip verification (graceful no-op)
  if (!secretKey) {
    return true;
  }

  // Secret key is set but no token provided → challenge not completed
  if (!token) {
    return false;
  }

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: secretKey, response: token }),
      }
    );

    if (!res.ok) return false;

    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch (err) {
    // Network failure talking to Cloudflare — fail open so legit users aren't blocked
    console.error('[turnstile] Verification request failed:', err);
    return true;
  }
}
