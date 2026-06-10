# Deployment Guide

Follow these steps to deploy BioArchive v2 on Cloudflare Pages.

### Step 1: Clone Repository and Install Dependencies
Clone the repository and install all required npm packages:
```bash
git clone <repository-url> bioarchive
cd bioarchive
npm install
```

### Step 2: Configure Local Environment Variables
Copy the local environment variable example template to `.env.local` and populate all configuration fields:
```bash
cp .env.local.example .env.local
```
Fill in the Google API credentials, Sheets ID, Drive folders, Cloudflare R2 configurations, Resend API key, and the admin token.

### Step 3: Build the Application
Generate the production static export build (the Next.js build is configured to output static files):
```bash
npm run build
```
This generates the static pages output under `.vercel/output/static` (or equivalent directory mapped via Next-on-Pages).

### Step 4: Deploy via Wrangler CLI
Deploy the static output directory directly to Cloudflare Pages:
```bash
npx wrangler pages deploy .vercel/output/static --project-name=bioarchive
```

### Step 5: Configure Production Environment Variables
In the Cloudflare Dashboard:
1. Navigate to **Pages** → **bioarchive** → **Settings** → **Environment Variables**.
2. Click **Add variables** under **Production** (and optionally **Preview**).
3. Add all the secret environment variables from your `.env.local` (e.g., `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `RESEND_API_KEY`, `ADMIN_DELETE_TOKEN`, etc.).

### Step 6: Bind Cloudflare KV Namespace
1. In the Cloudflare Dashboard, go to **Pages** → **bioarchive** → **Settings** → **Functions** (or **Bindings**).
2. Under **KV namespace bindings**, add a new binding.
3. Set the **Variable name** to `BIOARCHIVE_CACHE`.
4. Select or create your KV namespace (e.g., `bioarchive-cache`) and bind it.

### Step 7: Verify Deployment
Visit `https://bioarchive.pages.dev` (or the direct URL provided in your deployment CLI output). Test:
1. File upload using the upload panel.
2. File listing and navigation through the semesters/courses.
3. Downloading files to verify the counter and correct routing.

### Step 8: Add Custom Domain
If desired, link a custom domain to the application:
1. Go to **Pages** → **bioarchive** → **Settings** → **Custom domains**.
2. Click **Set up a custom domain** and follow the DNS instructions.

### Step 9: Verify Google Search Console Ownership
Verify ownership of the site via Google Search Console:
1. Retrieve the verification meta tag from the Google Search Console panel.
2. Add or update the meta tag in `src/app/layout.tsx` if not already present.
