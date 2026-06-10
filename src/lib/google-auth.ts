let cachedToken: string | null = null;
let tokenExpiryTime: number = 0; // Epoch time in ms

/**
 * Retrieves a valid Google API OAuth2 access token.
 * Caches the token and handles automatic refreshes when nearing expiry (within 60 seconds).
 */
export async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing required Google OAuth credentials in environment variables. " +
      "Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN."
    );
  }

  const now = Date.now();
  // Return cached token if it is valid and has more than 60 seconds of lifetime remaining
  if (cachedToken && (tokenExpiryTime - now > 60 * 1000)) {
    return cachedToken;
  }

  // Request new access token using the refresh token
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Google access token: ${response.statusText} - ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = data.access_token;
  tokenExpiryTime = Date.now() + (data.expires_in * 1000);

  return cachedToken;
}
