# 🔐 BioArchive v2 — Security Audit Report

> **Date:** June 21, 2026  
> **Scope:** Full codebase — API routes, middleware, auth, client-side storage, env config  
> **Severity Scale:** 🔴 Critical · 🟠 High · 🟡 Medium · 🟢 Low · ✅ Secure

---

## 1. Can users access data that doesn't belong to them?

### Findings

#### ✅ Admin routes are protected by middleware
[middleware.ts](file:///E:/bioarchive%20v2/src/middleware.ts#L41-L68) correctly gates `/admin` and `/api/admin/*` — verifies the JWT cookie, checks the `exp` claim, and validates the email against `ADMIN_EMAILS`.

#### ✅ Admin API endpoints enforce double-auth
Both `/api/delete` and `/api/admin/approve` call [`authorizeAdminRequest()`](file:///E:/bioarchive%20v2/src/lib/auth.ts#L112-L140), which:
1. Verifies the Google ID token with Google's live tokeninfo endpoint
2. Checks the email is in `ADMIN_EMAILS`
3. Validates the `ADMIN_DELETE_TOKEN` secret

#### ✅ File status filtering is enforced server-side
[`getFilesByCourse()`](file:///E:/bioarchive%20v2/src/lib/sheets.ts#L150-L158) filters to only `status === 'approved'` by default. Pending files never leak to public API calls.

#### 🟡 Medium — `/api/admin/config` GET is completely public (no auth)
[`/api/admin/config` GET handler](file:///E:/bioarchive%20v2/src/app/api/admin/config/route.ts#L52-L62) returns site configuration to **anyone** without any authentication check. While it deliberately excludes admin emails, it **does expose**:
- Feature toggle states (e.g., `requireModeration`, `requireNiserToUpload`, `requireNiserToDownload`)
- This lets an attacker know exactly which restrictions are active before crafting an attack.

**Attack scenario:** An attacker calls `GET /api/admin/config` to learn that `requireNiserToDownload: false`, confirming they can download without a token.

#### 🟡 Medium — Download counter can be spoofed via fake `fileId`
[`/api/download`](file:///E:/bioarchive%20v2/src/app/api/download/route.ts#L22-L29) accepts any `fileId` from the body. If `requireNiserToDownload` is off, **no auth is required**. An attacker can call this endpoint in a loop with arbitrary `fileId` values and inflate/corrupt download counts. The endpoint returns `{ success: true }` even if the record isn't found (the increment just throws internally).

#### 🟡 Medium — `/api/requests` POST has no authentication at all
[`POST /api/requests`](file:///E:/bioarchive%20v2/src/app/api/requests/route.ts#L48-L113) accepts file requests from **completely anonymous users** — no token, no email verification, no rate limit. Anyone can flood the Requests sheet with garbage data.

---

## 2. Can an attacker bypass rate limits and spam APIs?

### Findings

#### 🟠 High — Rate limiting only covers 2 out of 11 endpoints
Rate limiting via [`rateLimit()`](file:///E:/bioarchive%20v2/src/lib/rate-limit.ts) is only applied to:
- `POST /api/contact` — 3 per IP per 10 min ✅
- `POST /api/auth/login-log` — 10 per IP per 60 sec ✅

**These critical endpoints have NO rate limiting:**
| Endpoint | Risk |
|---|---|
| `POST /api/upload/session` | Attacker can create thousands of Drive upload sessions, exhausting Google API quota |
| `POST /api/upload/confirm` | Can flood Google Sheets with fake file records |
| `POST /api/download` | Can inflate download counters for any fileId |
| `GET /api/search` | Can DDoS Google Sheets API via repeated cache misses |
| `GET /api/files` | Same — repeated cache-busting queries exhaust Sheets quota |
| `GET /api/books` | Triggers multiple Google Drive API calls per request — easily DoS-able |
| `POST /api/requests` | Can spam the Requests sheet with garbage |
| `POST /api/admin/approve` | While auth-protected, brute-forceable on the `adminToken` field |
| `POST /api/delete` | Same — brute-forceable admin token |

#### 🔴 Critical — Rate limiter silently fails open on KV errors
[Rate limit line 67-70](file:///E:/bioarchive%20v2/src/lib/rate-limit.ts#L67-L71):
```typescript
} catch (err) {
  // KV error — fail open (don't block users due to infra issues)
  return { allowed: true, remaining: limit };
}
```
If Cloudflare KV throws **any error** (timeouts, quota, configuration issues), the rate limiter returns `allowed: true` unconditionally. A targeted attack against the KV namespace would disable all rate limiting.

#### 🟡 Medium — IP spoofing can bypass rate limits
[Rate limiter line 33-36](file:///E:/bioarchive%20v2/src/lib/rate-limit.ts#L33-L36):
```typescript
const ip =
  (request.headers as any).get?.('cf-connecting-ip') ||
  (request.headers as any).get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
  'unknown';
```
The `cf-connecting-ip` is injected by Cloudflare and is safe. However, `x-forwarded-for` is a **user-controlled header** that serves as the fallback. In non-Cloudflare environments (local dev, staging behind nginx), an attacker can spoof their IP by sending `X-Forwarded-For: 1.2.3.4` and reset their rate limit window indefinitely. The in-memory fallback (dev) is equally vulnerable.

#### 🟡 Medium — In-memory rate limit store is not shared across edge instances
[Rate limiter line 12](file:///E:/bioarchive%20v2/src/lib/rate-limit.ts#L12): `const memRateLimitStore = new Map(...)` — when KV is unavailable (e.g., local dev, or on first cold start), the fallback is a module-level in-memory `Map`. Since Cloudflare Workers/Pages spawn multiple edge instances, **each instance has its own counter**. An attacker who hits 10 different edge nodes gets 10× the allowed limit.

---

## 3. Are secret keys, API keys, and database credentials exposed?

### Findings

#### 🔴 Critical — Real credentials committed to `.env.local` (hardcoded secrets)
The file [`.env.local`](file:///E:/bioarchive%20v2/.env.local) contains **live production secrets**:

```
GOOGLE_CLIENT_SECRET=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
GOOGLE_REFRESH_TOKEN=1//04Ju89wdV15OmCgYIARAAGAQSNwF-L9Ir...
RESEND_API_KEY=re_euqMKqwd_HMyp9hGUQmtrb4EVqjabVi3J
ADMIN_DELETE_TOKEN=TheONE_393
```

While `.env.local` is correctly listed in [`.gitignore`](file:///E:/bioarchive%20v2/.gitignore#L22-L23), these are real, active credentials sitting on disk. **If this machine is compromised, shared, or the file is accidentally committed, all credentials are exposed.** These secrets should be rotated immediately and stored only in the Cloudflare Dashboard secrets vault.

#### 🟠 High — `NEXT_PUBLIC_ADMIN_EMAILS` fallback silently exports admin list to browser
[`auth.ts` line 100](file:///E:/bioarchive%20v2/src/lib/auth.ts#L100) and [`middleware.ts` line 62](file:///E:/bioarchive%20v2/src/middleware.ts#L62):
```typescript
const envVal = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || process.env.MOD_EMAILS || '';
```
The code falls back to `NEXT_PUBLIC_ADMIN_EMAILS`. In Next.js, any variable prefixed `NEXT_PUBLIC_` is **baked into the client-side bundle** and visible to every user. If someone ever set `NEXT_PUBLIC_ADMIN_EMAILS`, all admin email addresses would be publicly visible in the JS bundle — defeating the entire access control system.

#### 🟠 High — `config/index.ts` accepts `NEXT_PUBLIC_*` fallbacks for sensitive IDs
[`config/index.ts`](file:///E:/bioarchive%20v2/src/config/index.ts#L1-L6) falls back to `NEXT_PUBLIC_DRIVE_FOLDER_ID`, `NEXT_PUBLIC_SHEET_ID`, `NEXT_PUBLIC_DRIVE_QUARANTINE_FOLDER_ID`, and `NEXT_PUBLIC_BACKUP_DRIVE_FOLDER_ID`. If these are set as public env vars, Drive folder IDs and the Sheet ID are exposed in the browser — giving attackers a direct map to your database.

#### 🟡 Medium — `ADMIN_DELETE_TOKEN` is weak and predictable
[`.env.local` line 25](file:///E:/bioarchive%20v2/.env.local#L25): `ADMIN_DELETE_TOKEN=TheONE_393` is a short, guessable password. No brute-force protection exists on the admin endpoints (no rate limit, no lockout). Combined with #2 above, this is a realistic brute-force target.

---

## 4. Can a user modify requests and access protected resources?

### Findings

#### ✅ Email is extracted from verified Google token, not request body
[`/api/download`](file:///E:/bioarchive%20v2/src/app/api/download/route.ts#L31-L63) explicitly notes: *"The user's email is extracted from the verified Google ID token, NOT from the request body, to prevent email spoofing in download logs."* This is correct and secure.

#### ✅ File size and MIME type are re-verified server-side against Drive
[`/api/upload/confirm`](file:///E:/bioarchive%20v2/src/app/api/upload/confirm/route.ts#L97-L121) re-fetches the actual file metadata from Google Drive after upload, catching clients that lie about `fileSize` or `mimeType` during the session step.

#### 🟠 High — Middleware only does client-side JWT decoding (no signature verification)
[`middleware.ts` `decodeJWT()`](file:///E:/bioarchive%20v2/src/middleware.ts#L8-L34) only Base64-decodes the JWT payload. **It does not verify the cryptographic signature.** This means:

> An attacker can forge a JWT with a payload like `{ "email": "bioarchive007@gmail.com", "exp": 9999999999 }`, encode it as a valid-looking base64url JWT with any signature, set it as the `bioarchive_token` cookie, and **bypass middleware admin protection entirely**.

The comment even acknowledges this: *"Decodes the payload of a JWT client-side / edge-side without cryptographic verification."*

The actual security relies on the API routes calling `verifyGoogleToken()` — but the middleware route guard is **completely forgeable**.

#### 🟡 Medium — Upload `status` field comes from client-supplied metadata
[`/api/upload/confirm` line 95](file:///E:/bioarchive%20v2/src/app/api/upload/confirm/route.ts#L94-L95):
```typescript
const status = metadata.status || (siteConfig.requireModeration ? 'pending_approval' : 'approved');
```
`metadata.status` arrives from the request body. If an attacker sends `{ "metadata": { "status": "approved" } }`, the server trusts it — bypassing moderation. A moderated upload could be self-approved.

#### 🟡 Medium — `/api/upload/drive` is a fully open SSRF proxy
[`/api/upload/drive`](file:///E:/bioarchive%20v2/src/app/api/upload/drive/route.ts) accepts any URL in the `X-Upload-Url` header and proxies PUT requests to it. There is **no validation that the URL points to Google Drive**. An attacker can use this endpoint to make the server send arbitrary HTTP PUT requests to any URL — a classic **Server-Side Request Forgery (SSRF)** attack.

```bash
# Attacker POC:
curl -X PUT https://yourapp.com/api/upload/drive \
  -H "X-Upload-Url: http://internal-service/admin/reset" \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## 5. What happens if a JWT token gets stolen?

### Findings

#### 🟠 High — Tokens are stored in `localStorage` (XSS-accessible)
[`AuthProvider.tsx` lines 210-211](file:///E:/bioarchive%20v2/src/components/AuthProvider.tsx#L210-L211):
```typescript
localStorage.setItem('bioarchive:idToken', credential);
localStorage.setItem('bioarchive:user', JSON.stringify(decoded));
```
`localStorage` is accessible to any JavaScript running on the page. If an XSS vulnerability exists anywhere on the site, the attacker can steal the Google ID token instantly with `localStorage.getItem('bioarchive:idToken')`.

#### 🟠 High — Cookie is set with a 1-year expiry and no `HttpOnly`
[`AuthProvider.tsx` line 212](file:///E:/bioarchive%20v2/src/components/AuthProvider.tsx#L212):
```typescript
document.cookie = `bioarchive_token=${credential}; path=/; max-age=31536000; SameSite=Lax; Secure`;
```
- `max-age=31536000` = **365 days**. A Google ID token is only valid for **1 hour**, but the cookie persists for a year, which could confuse session management.
- Missing **`HttpOnly`** flag: JavaScript can read `document.cookie` and extract `bioarchive_token`. This is redundant with `localStorage` but means two vectors exist for token theft.
- Missing **`__Host-`** prefix: Without it, subdomain isolation isn't guaranteed.

#### 🟡 Medium — If the token is stolen, there's no revocation mechanism
Google ID tokens are short-lived (~1 hour), so stolen tokens expire quickly. However, there is **no server-side session table or token blacklist**. If a token is stolen, it remains valid until Google invalidates it. There is no "logout all sessions" mechanism.

#### 🟢 Low — No CSRF protection on API routes
The APIs use `SameSite=Lax` on the cookie which provides partial CSRF protection. However, since the middleware only checks the cookie (not a CSRF token), top-level navigation cross-site requests could still trigger unintended actions.

---

## 6. Can a single endpoint take down the entire system?

### Findings

#### 🔴 Critical — `/api/search` can exhaust Google Sheets API quota
[`/api/search`](file:///E:/bioarchive%20v2/src/app/api/search/route.ts#L39-L47) fetches **all files from Google Sheets** on cache miss. With no rate limit, an attacker can:
1. Find the KV cache key format (`files:approved:all`)
2. Wait for cache expiry (86400s) or hit a new edge instance without cache
3. Repeatedly trigger cold cache requests, each making a full Sheets API read

Google Sheets API has a **quota of 500 requests per 100 seconds per project**. A sustained attack easily hits this quota, bringing down **all API functionality** that depends on Sheets.

#### 🔴 Critical — `/api/books` triggers up to 5 chained Google Drive API calls per request
[`/api/books`](file:///E:/bioarchive%20v2/src/app/api/books/route.ts#L62-L145) with a `courseCode` parameter traverses: root folders → semester folders → course folders → course content → books subfolder. That's **4–5 sequential Drive API calls per request, no rate limit**. This will hit Google Drive API quota under any moderate load.

#### 🟠 High — `/api/files` cache TTL is 5 days, but cache invalidation is incomplete
[`/api/files`](file:///E:/bioarchive%20v2/src/app/api/files/route.ts) caches for 432,000 seconds (5 days). The delete/approve endpoints invalidate specific keys, but cache key patterns may not match if query parameters differ by case. A stale cache could serve deleted or unapproved files.

#### 🟠 High — Internal server errors leak stack traces
Throughout the codebase:
```typescript
return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
```
`err.message` is returned directly to the client. In Node.js/edge environments, error messages can contain internal paths, library versions, or sensitive context (e.g., `"Failed to refresh Google access token: invalid_grant - Token has been expired"`). This reveals implementation details to attackers.

#### 🟡 Medium — No circuit breaker on Google API calls
If Google APIs are slow or unavailable, all requests will hang for their full timeout duration. Under load, this exhausts the edge worker's CPU time budget and causes cascading timeouts. There's no fallback, no timeout cap, and no exponential backoff.

---

## Summary Table

| # | Threat | Finding | Severity |
|---|---|---|---|
| 1 | Unauthorized data access | `/api/admin/config` GET is public | 🟡 Medium |
| 1 | Unauthorized data access | Download count spoofable via fake fileId | 🟡 Medium |
| 1 | Unauthorized data access | `/api/requests` POST has zero auth | 🟡 Medium |
| 2 | Rate limit bypass | Only 2 of 11 endpoints rate-limited | 🟠 High |
| 2 | Rate limit bypass | Rate limiter fails open on KV errors | 🔴 Critical |
| 2 | Rate limit bypass | X-Forwarded-For IP spoofing | 🟡 Medium |
| 3 | Secret exposure | Live credentials in `.env.local` | 🔴 Critical |
| 3 | Secret exposure | `NEXT_PUBLIC_ADMIN_EMAILS` fallback | 🟠 High |
| 3 | Secret exposure | `NEXT_PUBLIC_*` fallbacks for Drive/Sheet IDs | 🟠 High |
| 3 | Secret exposure | Weak `ADMIN_DELETE_TOKEN` | 🟡 Medium |
| 4 | Request tampering | Middleware does not verify JWT signature | 🟠 High |
| 4 | Request tampering | Upload `status` field trusted from body | 🟡 Medium |
| 4 | Request tampering | `/api/upload/drive` is an SSRF proxy | 🟡 Medium |
| 5 | JWT theft | Token stored in `localStorage` (XSS-reachable) | 🟠 High |
| 5 | JWT theft | Cookie missing `HttpOnly` flag | 🟠 High |
| 5 | JWT theft | No token revocation mechanism | 🟡 Medium |
| 6 | Single-endpoint DoS | `/api/search` exhausts Sheets quota | 🔴 Critical |
| 6 | Single-endpoint DoS | `/api/books` chains 5 Drive API calls | 🔴 Critical |
| 6 | Single-endpoint DoS | `err.message` leaks internals in 500s | 🟠 High |
| 6 | Single-endpoint DoS | No circuit breaker on Google APIs | 🟡 Medium |

---

## Priority Fixes (Ordered by Impact)

1. **Rotate all credentials immediately** — `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `RESEND_API_KEY`, `ADMIN_DELETE_TOKEN`
2. **Add rate limiting to upload/session, upload/confirm, requests, search, books, and download endpoints**
3. **Validate `X-Upload-Url` header** in `/api/upload/drive` to only allow `*.googleapis.com` URLs
4. **Remove `metadata.status` trust** from the upload confirm body; derive status server-side only
5. **Add `HttpOnly` to `bioarchive_token` cookie** and move token out of `localStorage`
6. **Add a domain allowlist** to the `X-Upload-Url` validation (prevent SSRF)
7. **Remove all `NEXT_PUBLIC_*` fallbacks** for `ADMIN_EMAILS`, `SHEET_ID`, `DRIVE_*` IDs in config
8. **Cap `err.message` exposure** — return a generic error to clients, log full details server-side only
9. **Add an explicit timeout and circuit breaker** to Google API calls
10. **Require auth on `/api/requests` POST** (at minimum, a verified Google token)
