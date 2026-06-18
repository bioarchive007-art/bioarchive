# BioArchive — Complete Website Guide
### For Junior Maintainers & Future Administrators
*NISER · School of Biological Sciences*

---

> **Who is this guide for?**
> This document is written for the person who will take over BioArchive after the original developers leave. You do not need to be a coding expert to understand this guide. Every section uses plain English and step-by-step instructions. Read it from top to bottom the first time. Later you can jump to any section using the Table of Contents.

---

## Table of Contents

1. [What is BioArchive?](#1-what-is-bioarchive)
2. [The Big Picture — How Everything Connects](#2-the-big-picture--how-everything-connects)
3. [Tools & Services Used](#3-tools--services-used)
4. [Website Pages & What They Do](#4-website-pages--what-they-do)
5. [All Features Explained](#5-all-features-explained)
6. [Admin Panel — Complete Guide](#6-admin-panel--complete-guide)
7. [Admin Logins, Passwords & Access Control](#7-admin-logins-passwords--access-control)
8. [Security — How the Site is Protected](#8-security--how-the-site-is-protected)
9. [Backend & Frontend — How They Talk to Each Other](#9-backend--frontend--how-they-talk-to-each-other)
10. [All API Endpoints Explained](#10-all-api-endpoints-explained)
11. [Google Services — Sheets, Drive & OAuth](#11-google-services--sheets-drive--oauth)
12. [Cloudflare — Pages, KV Cache & Workers](#12-cloudflare--pages-kv-cache--workers)
13. [Resend — Email Notifications](#13-resend--email-notifications)
14. [Google Analytics](#14-google-analytics)
15. [Environment Variables — What Each One Does](#15-environment-variables--what-each-one-does)
16. [wrangler.toml — The Master Configuration File](#16-wranglertoml--the-master-configuration-file)
17. [The SiteConfig Sheet — Feature Toggles](#17-the-siteconfig-sheet--feature-toggles)
18. [File Upload Flow — Step by Step](#18-file-upload-flow--step-by-step)
19. [File Download Flow — Step by Step](#19-file-download-flow--step-by-step)
20. [Caching System — Why Files Load Instantly](#20-caching-system--why-files-load-instantly)
21. [Deployment Guide — How to Deploy Changes](#21-deployment-guide--how-to-deploy-changes)
22. [Adding & Removing Admins](#22-adding--removing-admins)
23. [Changing the Admin Password](#23-changing-the-admin-password)
24. [Adding a New Course](#24-adding-a-new-course)
25. [Managing Notices & Announcements](#25-managing-notices--announcements)
26. [DDoS & Abuse Protection](#26-ddos--abuse-protection)
27. [Common Errors & How to Fix Them](#27-common-errors--how-to-fix-them)
28. [Google Credential Rotation — When Tokens Expire](#28-google-credential-rotation--when-tokens-expire)
29. [How to Add a New Feature](#29-how-to-add-a-new-feature)
30. [What NOT to Touch](#30-what-not-to-touch)
31. [Emergency Checklist](#31-emergency-checklist)

---

## 1. What is BioArchive?

**BioArchive** is a website for NISER (National Institute of Science Education and Research) students of the School of Biological Sciences (SBS). It is a study material library where students can:

- Browse and download question papers, notes, slides, lab materials, and assignments for every course
- Upload their own study materials (with admin approval)
- Access recommended reference textbooks
- Request materials that are not yet on the site
- Read announcements and notices posted by administrators
- Contact administrators through a contact form

The website is designed to be **fast**, **secure**, and **easy to use**. It stores files in Google Drive, stores metadata (file names, upload dates, etc.) in Google Sheets, and is deployed (made live on the internet) through Cloudflare Pages.

---

## 2. The Big Picture — How Everything Connects

Here is a simple diagram of how everything works together:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THE USER'S BROWSER                           │
│  (Student opens the website, clicks things, uploads files)          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │  HTTPS requests
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│           CLOUDFLARE PAGES (where the website is hosted)            │
│   Next.js 14 App running as "Edge Functions" on Cloudflare's CDN    │
│                                                                     │
│  ┌─────────────────┐  ┌───────────────┐  ┌───────────────────────┐ │
│  │   Pages (HTML)  │  │  API Routes   │  │   KV Cache (Storage)  │ │
│  │  (/course,      │  │  (/api/files, │  │  Stores file lists    │ │
│  │   /admin, etc.) │  │   /api/upload │  │  for up to 5 days     │ │
│  └─────────────────┘  │   /api/delete │  └───────────────────────┘ │
│                       │   etc.)       │                             │
│                       └───────┬───────┘                             │
└───────────────────────────────┼─────────────────────────────────────┘
                                │  Google OAuth API calls
                                ▼
┌───────────────────────────────────────────────────────────────────┐
│              GOOGLE SERVICES                                      │
│                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐  │
│  │   Google Sheets     │    │         Google Drive            │  │
│  │  (The Database)     │    │    (Where files are stored)     │  │
│  │                     │    │                                 │  │
│  │  Tab: Sheet1        │    │  Folder: BioArchive Files       │  │
│  │  (all file records) │    │  Folder: Quarantine (pending)   │  │
│  │  Tab: SiteConfig    │    │  Folder: Backup                 │  │
│  │  (feature toggles)  │    │  Folder: Books                  │  │
│  │  Tab: Requests      │    └─────────────────────────────────┘  │
│  │  Tab: Notices       │                                          │
│  │  Tab: LoginHistory  │    ┌─────────────────────────────────┐  │
│  │  Tab: FileDownloads │    │      Google OAuth / Login       │  │
│  │  Tab: BookDownloads │    │   (SSO — students sign in with  │  │
│  └─────────────────────┘    │    their Google/NISER account)  │  │
│                             └─────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
                                │
                                │ Email notifications
                                ▼
                    ┌───────────────────────┐
                    │        RESEND         │
                    │  (sends emails to     │
                    │   moderators when     │
                    │   files are uploaded) │
                    └───────────────────────┘
```

**Summary in simple words:**
- **Cloudflare Pages** is where the website lives and runs. Think of it like the restaurant.
- **Google Sheets** is the database. It stores the list of every file, who uploaded it, download counts, etc. Think of it like the order book.
- **Google Drive** is where actual PDF files are stored. Think of it like the kitchen storage.
- **Resend** sends emails to moderators when someone uploads a file. Think of it like a waiter telling the chef about a new order.
- **Cloudflare KV** is a fast temporary storage (cache). It saves the file list for 5 days so that the site doesn't call Google Sheets every single time a student opens a course page.

---

## 3. Tools & Services Used

| Tool | What It Does | Where to Manage It |
|------|-------------|-------------------|
| **Next.js 14** | The website framework (the code that creates the pages) | Code files in this project |
| **Cloudflare Pages** | Hosts the website on the internet | https://dash.cloudflare.com → Pages → bioarchive |
| **Cloudflare KV** | Fast cache storage for file lists | https://dash.cloudflare.com → KV → BIOARCHIVE_CACHE |
| **Google Sheets** | Database for file metadata, config, notices, requests | https://docs.google.com/spreadsheets/d/1-SEUn_HG62-T06ZRV_vkeHZ5eDTOi4Fuu566KvDDMOo |
| **Google Drive** | Stores actual PDF/PPTX files | https://drive.google.com (bioarchive007@gmail.com account) |
| **Google OAuth 2.0** | Lets students sign in with their Google accounts | https://console.cloud.google.com → APIs → Credentials |
| **Resend** | Sends email notifications | https://resend.com |
| **Google Analytics** | Tracks website visits | https://analytics.google.com (Tracking ID: G-CZS52D25M3) |
| **Wrangler** | Command-line tool to deploy to Cloudflare | Installed on your computer, run in terminal |
| **Node.js / npm** | Required to run and build the project | Install from https://nodejs.org |
| **TypeScript** | Programming language used for code | Part of the project |

---

## 4. Website Pages & What They Do

The website has the following pages, all located in the `src/app/` folder:

| Page URL | Folder | What It Shows |
|----------|--------|---------------|
| `/` | `src/app/page.tsx` | Home page — shows search bar, semester grid, and quick-access buttons |
| `/course/[semester]/[courseCode]` | `src/app/course/` | Shows all files for a specific course in a specific semester |
| `/features` | `src/app/features/` | Describes BioArchive features (static info page) |
| `/about` | `src/app/about/` | About the project (static info page) |
| `/notices` | `src/app/notices/` | Shows active announcements from admins |
| `/requests` | `src/app/requests/` | Students can see and submit file requests |
| `/contact` | `src/app/contact/` | Contact form to email moderators |
| `/admin` | `src/app/admin/page.tsx` | **Admin Panel** — restricted, shows 404 to non-admins |

### Important: The Admin Page is Hidden

If a student or anyone who is not an admin tries to visit `/admin`, the website **shows a 404 Not Found page** — as if the admin page does not exist. This is done by the middleware (see [Security section](#8-security--how-the-site-is-protected)).

Only people whose email is in the `ADMIN_EMAILS` list (plus the master account `bioarchive007@gmail.com`) can see the real admin page.

---

## 5. All Features Explained

BioArchive has features that can be turned **ON or OFF** by admins through the Admin Panel. Here is what each feature does:

### Security & Data Logging Features

| Feature Name | What It Does When ON | What Happens When OFF |
|---|---|---|
| **Collect Email Addresses** | Records the email of every person who logs in or downloads a file in Google Sheets | Logs "Anonymous" instead of the real email |
| **Collect Device User Agents** | Records what browser and device students use | Logs "Omitted" instead |
| **Collect Timestamps** | Records the exact date and time of each login and download | Logs "Omitted" instead |
| **Rename Uploaded Files** | Automatically renames files to a standard format like `BIO301_Smith_notes_2026.pdf` | Keeps the original filename the student used |
| **Require Moderator Approval** | New uploads go to a "Pending" queue — admins must manually approve each file | Files are instantly public without review (NOT recommended) |
| **Restrict to @niser.ac.in** | Only students with `@niser.ac.in` email can log in | Allows Gmail or any email to log in |
| **Log Detailed Download Entries** | Writes a full record of each download to the `FileDownloads` sheet | Skips the detailed log (but still counts downloads) |
| **Require @niser.ac.in to Upload** | Only `@niser.ac.in` email users can upload files | Anyone who is logged in can upload |
| **Require @niser.ac.in to Download** | Only `@niser.ac.in` email users can download | Anyone can download without an account |

### User Interface Features

| Feature Name | What It Does When ON | What Happens When OFF |
|---|---|---|
| **Enable In-App Previews** | Students can preview PDFs inside the browser without downloading | Preview button is hidden |
| **Enable Reference Textbooks** | Shows the "Books" section on course pages | Books section is hidden |
| **Enable Materials Upload** | Shows the upload button; students can submit files | Upload button is hidden; uploads are blocked |
| **Enable Materials Request Board** | Shows the `/requests` page; students can request files | Page is hidden |
| **Enable Announcement Notice Board** | Shows the `/notices` page with admin announcements | Page is hidden |
| **Enable Landing Page Search** | Shows the search bar on the home page | Search bar is hidden |
| **Enable Moderator Contact Form** | Shows the `/contact` page | Page is hidden |
| **Enable Materials Download** | Shows download buttons; students can download | Download buttons are hidden; downloads are blocked |

### How to Change These Features

1. Go to `/admin` on the website
2. Log in with your Google account (must be an admin email)
3. Enter the Admin Token (password)
4. Click the **"Feature Controller"** tab
5. Click the toggle switch next to any feature to turn it ON or OFF
6. The change saves automatically to the Google Sheets `SiteConfig` tab

---

## 6. Admin Panel — Complete Guide

The Admin Panel is located at: **`your-website-url/admin`**

### What the Admin Panel Can Do

The Admin Panel has three tabs:

#### Tab 1: Pending Review

This shows files that students have uploaded but that are **waiting for an admin to approve**.

For each pending file, you can see:
- The course code and name
- The file name
- The professor's name
- The year
- The exam type (if applicable)
- Who uploaded it and when
- The file type (Question Paper, Notes, Slides, etc.)

**Actions you can take:**
- **Approve** — This moves the file from the quarantine folder to the correct folder in Google Drive, makes it publicly accessible, creates a backup copy, and updates the status in Google Sheets to "approved". The file will then appear on the website.
- **Reject** — This permanently deletes the file from both Google Drive and Google Sheets. The file is gone forever. Use this for spam, wrong files, or copyrighted material.

#### Tab 2: Approved Registry

This shows **all files that are currently live on the website**. For each file, you can see:
- Course code
- File name and type
- Professor
- Uploader name
- Download count (how many times it has been downloaded)

**Actions you can take:**
- **Delete (trash icon)** — Permanently removes an approved file from the website, Google Drive, and Google Sheets. This is irreversible.

#### Tab 3: Feature Controller

This is where you turn features ON and OFF. See [Section 5](#5-all-features-explained) and [Section 17](#17-the-siteconfig-sheet--feature-toggles) for full details.

### Admin Login Process (Two Layers of Security)

**Layer 1 — Google SSO (Sign-In with Google)**
- The admin must first sign in with their Google account
- The email must be in the `ADMIN_EMAILS` list in `wrangler.toml`
- If the email is not on the list, they get blocked even after signing in

**Layer 2 — Admin Token (Password)**
- After Google sign-in is verified, the admin must enter the secret Admin Token
- This token is set in `ADMIN_DELETE_TOKEN` in `wrangler.toml`
- The current token is: `TheONE_393`
- ⚠️ **Change this token immediately if you believe it has been leaked**

---

## 7. Admin Logins, Passwords & Access Control

### Who is an Admin?

There are two types of admin accounts:

1. **Master Admin Account**: `bioarchive007@gmail.com` — This account has permanent access and cannot be removed by configuration (it is hardcoded in the middleware as a fallback safety net). This is the main account.

2. **Additional Admins**: Any email listed in `ADMIN_EMAILS` in `wrangler.toml`. You can add multiple emails separated by commas.

### How to Add a New Admin

1. Open the file `wrangler.toml` (located in the main project folder `e:\bioarchive v2\`)
2. Find this line:
   ```toml
   ADMIN_EMAILS = "bioarchive007@gmail.com"
   ```
3. Add the new admin's email, separated by a comma:
   ```toml
   ADMIN_EMAILS = "bioarchive007@gmail.com,newadmin@gmail.com"
   ```
4. Also update the `NEXT_PUBLIC_ADMIN_EMAILS` line the same way:
   ```toml
   NEXT_PUBLIC_ADMIN_EMAILS = "bioarchive007@gmail.com,newadmin@gmail.com"
   ```
5. Save the file
6. Redeploy the website (see [Section 21](#21-deployment-guide--how-to-deploy-changes))

> ⚠️ **IMPORTANT**: Both `ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_EMAILS` must always have the same list. If they are different, some checks will fail.

### How to Remove an Admin

1. Open `wrangler.toml`
2. Remove the email from both `ADMIN_EMAILS` and `NEXT_PUBLIC_ADMIN_EMAILS`
3. Save and redeploy

### How to Change the Admin Token (Password)

The Admin Token is the secret password that admins enter on the `/admin` login page. It is used to verify that the person signing in is a real admin and not someone who just knows an admin email.

1. Open `wrangler.toml`
2. Find this line:
   ```toml
   ADMIN_DELETE_TOKEN = "TheONE_393"
   ```
3. Change the value to a new strong password (no spaces):
   ```toml
   ADMIN_DELETE_TOKEN = "MyNewSecretToken2026"
   ```
4. Save the file
5. Redeploy the website
6. **Tell all admins the new token** — their old token will no longer work

### What the Admin Can and Cannot Do Through the Panel

| Can Do | Cannot Do |
|--------|-----------|
| Approve or reject uploaded files | Change the Google Drive folder structure |
| Delete any file from the website | Add new courses (must be done in Google Sheets manually) |
| Turn website features ON or OFF | Change admin emails (must edit wrangler.toml) |
| See all uploaded files and their download counts | Change the admin password (must edit wrangler.toml) |
| — | Directly edit Google Sheets |

---

## 8. Security — How the Site is Protected

### Layer 1: Cloudflare Web Application Firewall (WAF)

Cloudflare sits in front of the website and automatically blocks:
- Common hacking attempts (SQL injection, XSS attacks)
- Requests from countries known for abuse
- Bots and crawlers
- DDoS (Distributed Denial of Service) attacks

To manage this, go to the Cloudflare Dashboard → your domain → Security → WAF.

### Layer 2: Admin Page Cloaking (Middleware)

**File responsible**: `src/middleware.ts`

When someone visits `/admin` or `/api/admin/*`, the middleware checks:
1. Does the person have a login cookie called `bioarchive_token`?
2. If yes, is the email in that cookie one of the admin emails?
3. If either answer is NO → the server shows a 404 Not Found page

This means **hackers cannot even tell the admin page exists**. They see a 404 just like any other missing page.

The middleware also runs for all API routes under `/api/admin/*`, returning `{ error: "Not found" }` with a 404 status code.

**What this means practically:**
- A student who goes to `bioarchive.pages.dev/admin` sees "404 Not Found"
- An admin who goes to the same URL, while logged in, sees the real Admin Panel

### Layer 3: Two-Factor Admin Authentication

To do any admin action, the server checks:
1. Google SSO Token (proves the person is who they say they are via Google)
2. `ADMIN_DELETE_TOKEN` (the secret password only admins know)

Both must be correct. If either fails, the request is rejected.

### Layer 4: NISER Email Restriction

Controlled by the `restrictToInstitutionalEmail` and `requireNiserToUpload` / `requireNiserToDownload` feature toggles.

When enabled, the server verifies on the backend (not just the browser) that the user's email ends with `@niser.ac.in`. Admin emails (like `bioarchive007@gmail.com`) are automatically whitelisted.

**File responsible**: `src/lib/auth.ts` — the `isAuthorizedEmail()` function.

### Layer 5: MD5 Duplicate Detection

When a file is uploaded, the website calculates a unique fingerprint (MD5 hash) of the file. If the same file has already been uploaded before (even with a different name), the system flags it as a duplicate — and highlights that row in **orange** in Google Sheets. This prevents the same file from being stored twice.

### DDoS Protection

Cloudflare provides automatic DDoS protection at Layer 3, 4, and 7. For additional protection:
1. Go to Cloudflare Dashboard → Security → DDoS
2. Enable **HTTP DDoS Attack Protection** (set to "High" sensitivity)
3. Enable **Rate Limiting** — Go to Security → WAF → Rate Limiting Rules
   - Set a rule: Max 100 requests per minute per IP
4. Enable **Bot Fight Mode** — Security → Bots → Turn on Bot Fight Mode
5. Under **Settings**, turn on "Always Use HTTPS" and "HSTS"

---

## 9. Backend & Frontend — How They Talk to Each Other

### What is "Frontend"?

The **frontend** is everything the user *sees* in their browser — the buttons, the text, the file lists, the upload form. Frontend code runs inside the student's browser. It is written in React (TypeScript).

All frontend page files are in `src/app/` (the page files, like `page.tsx`).

### What is "Backend"?

The **backend** is the server-side code that does the actual work — talking to Google Sheets, verifying who is logged in, deleting files. The student's browser cannot do this directly (it would be a security risk). So the browser asks the backend to do it.

All backend code files are in `src/app/api/` (the API route files, named `route.ts`).

### How They Talk

The browser uses a JavaScript method called `fetch()` to send requests to the backend. For example, when a student opens a course page:

1. Browser sends a request to `/api/files?courseCode=BIO301&semester=3`
2. The backend (running on Cloudflare Edge) receives this request
3. The backend checks if this data is in the Cloudflare KV cache
4. If it is in cache: returns it immediately (very fast!)
5. If not in cache: fetches the data from Google Sheets, stores it in cache, and returns it
6. Browser receives the data and displays the file list

### Runtime: "Edge" Functions

Every backend API file starts with this line at the top:
```typescript
export const runtime = 'edge';
```

This means the code runs at Cloudflare's **Edge** — on servers physically close to the student (in their country or region). This is why the website loads so fast.

**IMPORTANT**: Because it runs on Edge (not a regular server), you **cannot use Node.js-specific features** like reading files from a local disk (`fs`, `path`). Everything must go through HTTP APIs (like Google's API). This is a key limitation to keep in mind.

### Authentication Token Flow

When a student signs in with Google:
1. Google gives them a JWT (JSON Web Token) — a string of encoded data
2. This token is stored in the browser as a cookie named `bioarchive_token`
3. When the student does actions (upload, download), the browser sends this token to the backend
4. The backend verifies the token with Google at `https://oauth2.googleapis.com/tokeninfo`
5. Once verified, the backend knows exactly who is making the request

---

## 10. All API Endpoints Explained

All API endpoints are in `src/app/api/`. Each folder has a `route.ts` file.

| Endpoint | Method | Who Can Use It | What It Does |
|----------|--------|----------------|-------------|
| `GET /api/files` | GET | Everyone | Returns file list for a course (with cache) |
| `GET /api/search` | GET | Everyone | Searches across all approved files |
| `GET /api/notices` | GET | Everyone | Returns active announcements |
| `GET /api/requests` | GET | Everyone | Returns the file request list |
| `POST /api/requests` | POST | Everyone | Submits a new file request |
| `GET /api/books` | GET | Everyone | Returns textbook list from Drive |
| `POST /api/download` | POST | Logged-in users | Logs a download and increments count |
| `POST /api/contact` | POST | Everyone | Sends a contact form email via Resend |
| `POST /api/upload/drive` | POST | Logged-in users | Uploads a file to the Google Drive quarantine folder |
| `POST /api/upload/session` | POST | Logged-in users | Starts an upload session |
| `POST /api/upload/confirm` | POST | Logged-in users | Finalizes an upload and records it in Sheets |
| `POST /api/delete` | POST | Admins only | Deletes a file from Drive and Sheets |
| `GET /api/admin/config` | GET | Anyone | Returns the site feature configuration |
| `POST /api/admin/config` | POST | Admins only | Updates the site feature configuration |
| `POST /api/admin/approve` | POST | Admins only | Approves a pending file |
| `POST /api/admin/list` | POST | Admins only | Lists all files (pending + approved) |
| `POST /api/auth/login-log` | POST | Logged-in users | Records a login event in Sheets |

---

## 11. Google Services — Sheets, Drive & OAuth

### Google Sheets (The Database)

**Spreadsheet ID**: `1-SEUn_HG62-T06ZRV_vkeHZ5eDTOi4Fuu566KvDDMOo`

The spreadsheet has these tabs:

| Tab Name | What Is Stored There |
|----------|---------------------|
| `Sheet1` | Every uploaded file record (fileId, course, professor, status, download count, etc.) |
| `SiteConfig` | Feature ON/OFF toggles (controlled from Admin Panel) |
| `Requests` | Student file requests |
| `Notices` | Admin announcements |
| `LoginHistory` | Log of every login with email, name, and timestamp |
| `FileDownloads` | Detailed log of every file download |
| `BookDownloads` | Detailed log of every textbook download |

**Sheet1 columns** (in order):
`fileId` | `r2Key` | `driveFileId` | `semester` | `year` | `courseCode` | `courseName` | `professor` | `professor2` | `professor3` | `examType` | `fileType` | `fileName` | `uploaderName` | `uploadDate` | `md5Hash` | `r2Url` | `driveWebViewLink` | `downloadCount` | `remarks` | `status`

The `status` column can be:
- `approved` — file is live on the website
- `pending_approval` — file is in quarantine, waiting for admin approval

**How to access the sheet directly:**
- Open the link above in a browser
- Sign in with `bioarchive007@gmail.com`

> ⚠️ **Never manually delete columns** from the Sheets. The code expects them in a specific order. You can edit cell values (like fixing a wrong course name), but don't add or remove columns without updating the code in `src/config/index.ts`.

### Google Drive (File Storage)

**Main BioArchive Folder ID**: `1AcpuO4CFHMAttp1gYOgjJH7GbOnQg9ve`
**Quarantine Folder ID**: `1_WpOQsN42kn5mbrz2rwEpdViucTYvWVX`
**Backup Folder ID**: `1bb8KAvBfnRXMi44cJCYY54aGEC952NAL`
**Books Folder ID**: `1h8SeGTJgtoxD57JXxYG_wkOfeAeDms4d`

**How the folder structure works:**
When a file is approved, the code automatically creates and navigates into subfolders like this:
```
Main Folder/
├── Core Courses/
│   ├── Sem 1/
│   │   └── BIO101 Introduction to Biology/
│   │       ├── Question Papers/
│   │       ├── Notes/
│   │       ├── Slides/
│   │       ├── Lab Material/
│   │       ├── Assignments/
│   │       └── Other/
│   └── Sem 2/ ...
└── Adv Courses/
    └── BIO601 Advanced Genetics/
        └── ...
```

The system creates these folders automatically if they don't exist.

### Google OAuth 2.0 (Login System)

Used to let users sign in with their Google accounts. Credentials are stored in environment variables:

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | The OAuth app's Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | The secret key for the OAuth app |
| `GOOGLE_REFRESH_TOKEN` | A token that lets the server refresh its own access to Google APIs without re-logging in |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same as `GOOGLE_CLIENT_ID` but shared with the browser (for the login button) |

**How the server accesses Google APIs (Sheets, Drive):**
The server uses `GOOGLE_REFRESH_TOKEN` to get short-lived access tokens. The code in `src/lib/google-auth.ts` handles this automatically. The access token is cached in memory for up to 1 hour. You don't need to do anything special — it refreshes itself.

**When the refresh token expires** (usually after 6 months of inactivity or if you revoke permissions):
See [Section 28](#28-google-credential-rotation--when-tokens-expire) for how to fix this.

---

## 12. Cloudflare — Pages, KV Cache & Workers

### Cloudflare Pages

This is where the website is "deployed" (made available on the internet).

**Account**: You need the login for the Cloudflare account. Ask the previous admin.

**Project name**: `bioarchive`

**To see the current deployment:**
1. Go to https://dash.cloudflare.com
2. Click "Pages" on the left sidebar
3. Find "bioarchive"
4. You can see deployment history, custom domains, and environment variables here

**Important**: Environment variables (secrets like `GOOGLE_CLIENT_SECRET`) set in the **Cloudflare Dashboard** are separate from variables in `wrangler.toml`. **NEVER put the same variable in both places** — this causes a deployment crash with the error "duplicate binding".

Currently, the split is:
- **In `wrangler.toml`** (safe to put in the code file): `ADMIN_EMAILS`, `NEXT_PUBLIC_ADMIN_EMAILS`, `ADMIN_DELETE_TOKEN`, `SITE_NAME`, Drive Folder IDs, Sheet ID, `BOOKS_DRIVE_FOLDER_ID`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- **In Cloudflare Dashboard** (secrets, never in code): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `RESEND_API_KEY`, `MOD_EMAILS`, `SENDER_EMAIL`

### Cloudflare KV (Key-Value Storage / Cache)

**Binding name**: `BIOARCHIVE_CACHE`
**KV Namespace ID**: `0e78e1d8be9d42e08e340193683f81e9`

KV is a fast storage system. The website stores file lists there so it doesn't have to call Google Sheets every time.

**Cache TTLs (how long data stays in cache):**
| Data | How Long Cached |
|------|----------------|
| File lists (per course) | 5 days (432000 seconds) |
| All approved files (for search) | 1 day (86400 seconds) |
| Notices | 5 minutes (300 seconds) |
| File requests | 1 minute (60 seconds) |
| Books | 5 days (432000 seconds) |

**When the cache is automatically cleared:**
- When an admin approves a file — that course's cache is cleared
- When an admin deletes a file — that course's cache is cleared
- When a new file is uploaded — that course's cache is cleared

**How to manually clear the KV cache** (if the website is showing old data):
1. Go to https://dash.cloudflare.com → KV → BIOARCHIVE_CACHE
2. Click "View" next to the namespace
3. You can see all cached keys listed there
4. Click the trash icon to delete specific keys, OR
5. You can use the Wrangler command line:
   ```bash
   npx wrangler kv key list --namespace-id=0e78e1d8be9d42e08e340193683f81e9
   npx wrangler kv key delete "files:BIO301:3" --namespace-id=0e78e1d8be9d42e08e340193683f81e9
   ```

---

## 13. Resend — Email Notifications

**Service**: https://resend.com
**What it does**: Sends automatic emails when:
- A student uploads files (email sent to admins/moderators)
- Someone fills out the contact form (email sent to admins/moderators)

**How it works:**
1. The code calls the Resend API at `https://api.resend.com/emails`
2. It sends the API key (`RESEND_API_KEY`) to authenticate
3. The email is sent from the `SENDER_EMAIL` address
4. The email goes to all addresses in `MOD_EMAILS`

**Environment variables needed:**

| Variable | Description | Where to Set |
|----------|-------------|-------------|
| `RESEND_API_KEY` | Your Resend account API key | Cloudflare Dashboard (secret) |
| `MOD_EMAILS` | Comma-separated list of emails that receive notifications | Cloudflare Dashboard (secret) |
| `SENDER_EMAIL` | The "From" email address | Cloudflare Dashboard |

**To get a new Resend API key:**
1. Go to https://resend.com → Log in
2. Go to API Keys
3. Create a new key
4. Copy the key and update it in Cloudflare Dashboard → bioarchive → Settings → Environment Variables

**If emails are not being sent:**
- Check that `RESEND_API_KEY` is correctly set in Cloudflare Dashboard (NOT in `wrangler.toml`)
- Check that `MOD_EMAILS` is correctly set
- Check the Cloudflare Pages function logs for error messages

---

## 14. Google Analytics

**Tracking ID**: `G-CZS52D25M3`

Google Analytics automatically tracks:
- How many people visit the website each day
- Which pages are most visited
- Where visitors are from
- What devices they use

The tracking code is added in `src/app/layout.tsx`. You do not need to change anything here.

To view analytics, go to https://analytics.google.com and sign in with the account that owns tracking ID `G-CZS52D25M3`.

---

## 15. Environment Variables — What Each One Does

Environment variables are settings that the website reads when it runs. They are like hidden configuration values. There are two places to set them:

### In `wrangler.toml` (in the `[vars]` section)

```toml
[vars]
SITE_NAME = "BioArchive"
DRIVE_FOLDER_ID = "1AcpuO4CFHMAttp1gYOgjJH7GbOnQg9ve"
DRIVE_QUARANTINE_FOLDER_ID = "1_WpOQsN42kn5mbrz2rwEpdViucTYvWVX"
SHEET_ID = "1-SEUn_HG62-T06ZRV_vkeHZ5eDTOi4Fuu566KvDDMOo"
BOOKS_DRIVE_FOLDER_ID = "1h8SeGTJgtoxD57JXxYG_wkOfeAeDms4d"
BACKUP_DRIVE_FOLDER_ID = "1bb8KAvBfnRXMi44cJCYY54aGEC952NAL"
NEXT_PUBLIC_GOOGLE_CLIENT_ID = "886964169969-..."
ADMIN_EMAILS = "bioarchive007@gmail.com"
NEXT_PUBLIC_ADMIN_EMAILS = "bioarchive007@gmail.com"
ADMIN_DELETE_TOKEN = "TheONE_393"
```

### In Cloudflare Dashboard (Environment Variables, set as "Secrets")

| Variable Name | What It Stores |
|--------------|----------------|
| `GOOGLE_CLIENT_ID` | Google OAuth app Client ID (same as NEXT_PUBLIC_GOOGLE_CLIENT_ID but for backend) |
| `GOOGLE_CLIENT_SECRET` | The secret key of the OAuth app — never share this |
| `GOOGLE_REFRESH_TOKEN` | Lets the server access Google APIs on behalf of the archive account |
| `RESEND_API_KEY` | The API key for sending emails |
| `MOD_EMAILS` | Comma-separated list of admin/moderator emails that receive notifications |
| `SENDER_EMAIL` | The "From" address for notification emails (e.g., `archive@yourdomain.com`) |

> ⚠️ **CRITICAL RULE**: A variable must ONLY appear in one place — either in `wrangler.toml` OR in the Cloudflare Dashboard. NEVER BOTH. If it appears in both, the deployment will crash with an error about duplicate bindings.

---

## 16. wrangler.toml — The Master Configuration File

**File location**: `e:\bioarchive v2\wrangler.toml`

This is one of the most important files in the project. It configures how the website is deployed to Cloudflare.

Here is the current content and what each line means:

```toml
name = "bioarchive"
# ^ The name of this project in Cloudflare Pages

pages_build_output_dir = ".vercel/output/static"
# ^ Where the built website files are stored (do not change this)

compatibility_date = "2024-09-23"
# ^ The date of Cloudflare's compatibility rules to use (rarely needs changing)

compatibility_flags = ["nodejs_compat"]
# ^ Enables Node.js compatibility on Cloudflare Edge (do not remove this)


[[kv_namespaces]]
binding = "BIOARCHIVE_CACHE"
# ^ The name the code uses to access the KV cache (e.g., globalThis.BIOARCHIVE_CACHE)
id = "0e78e1d8be9d42e08e340193683f81e9"
# ^ The actual KV namespace ID in Cloudflare

[vars]
SITE_NAME = "BioArchive"
DRIVE_FOLDER_ID = "1AcpuO4CFHMAttp1gYOgjJH7GbOnQg9ve"
# ^ The main Google Drive folder where approved files live

DRIVE_QUARANTINE_FOLDER_ID = "1_WpOQsN42kn5mbrz2rwEpdViucTYvWVX"
# ^ Where uploaded files go first (before admin approval)

SHEET_ID = "1-SEUn_HG62-T06ZRV_vkeHZ5eDTOi4Fuu566KvDDMOo"
# ^ The Google Spreadsheet ID

BOOKS_DRIVE_FOLDER_ID = "1h8SeGTJgtoxD57JXxYG_wkOfeAeDms4d"
# ^ Where reference textbooks are stored in Drive

BACKUP_DRIVE_FOLDER_ID = "1bb8KAvBfnRXMi44cJCYY54aGEC952NAL"
# ^ Where file backups are automatically copied to

NEXT_PUBLIC_GOOGLE_CLIENT_ID = "886964169969-..."
# ^ Google OAuth Client ID — public, used by the login button in the browser

ADMIN_EMAILS = "bioarchive007@gmail.com"
# ^ Comma-separated list of admin emails (for backend checks)

NEXT_PUBLIC_ADMIN_EMAILS = "bioarchive007@gmail.com"
# ^ Same list, but accessible to the browser (for frontend checks)

ADMIN_DELETE_TOKEN = "TheONE_393"
# ^ The secret password for the Admin Panel. CHANGE THIS if compromised.
```

**When to change this file:**
- Adding/removing admin emails
- Changing the admin token/password
- Changing Drive folder IDs (if you reorganize files)
- Changing the Google Sheets ID

**After changing this file, you MUST redeploy.** Changes do not take effect until deployment.

---

## 17. The SiteConfig Sheet — Feature Toggles

**Where to find it**: Open the Google Spreadsheet → Click the "SiteConfig" tab

The SiteConfig tab has two columns:
- Column A: Feature name (e.g., `enableUploads`)
- Column B: Value (`true` or `false`)

**How to change a feature directly in Sheets** (alternative to using the Admin Panel):
1. Open the spreadsheet
2. Go to the `SiteConfig` tab
3. Find the feature row you want to change
4. Change the value in column B from `true` to `false` or vice versa
5. The change takes effect **within 5 minutes** (cached for 5 min in some cases, or immediately when the cache expires)

**All available feature keys and their default values:**

| Feature Key | Default | Meaning |
|-------------|---------|---------|
| `collectEmails` | `true` | Record user emails in logs |
| `collectUserAgents` | `true` | Record browser info in logs |
| `collectTimestamps` | `true` | Record timestamps in logs |
| `renameFiles` | `true` | Auto-rename uploaded files |
| `requireModeration` | `true` | Require admin approval for uploads |
| `restrictToInstitutionalEmail` | `true` | Restrict login to @niser.ac.in |
| `enableFilePreviews` | `true` | Show in-app PDF preview |
| `enableReferenceBooks` | `true` | Show textbooks section |
| `enableUploads` | `true` | Allow file uploads |
| `enableFileRequests` | `true` | Show file request board |
| `enableNotices` | `true` | Show notices page |
| `enableSearch` | `true` | Show search bar |
| `enableDownloadLogging` | `true` | Log download details |
| `enableContactForm` | `true` | Show contact form |
| `enableDownloads` | `true` | Allow downloads |
| `requireNiserToUpload` | `true` | Only @niser.ac.in can upload |
| `requireNiserToDownload` | `true` | Only @niser.ac.in can download |

---

## 18. File Upload Flow — Step by Step

Here is exactly what happens when a student uploads a file:

**Step 1: Student Opens Upload Modal**
- Student is on a course page and clicks "Upload"
- A modal popup appears asking for file details (course, professor, year, exam type, etc.)
- The frontend code checks if uploading is allowed (`enableUploads === true` in SiteConfig)

**Step 2: Authentication Check (Frontend)**
- The student must be logged in with Google
- If `requireNiserToUpload` is ON, the system checks that the student's email ends with `@niser.ac.in`

**Step 3: Upload to Drive Quarantine (API: `/api/upload/drive`)**
- The file is uploaded directly to the **Quarantine folder** in Google Drive
- The quarantine folder is: `1_WpOQsN42kn5mbrz2rwEpdViucTYvWVX`
- At this point, the file is NOT visible to other students

**Step 4: Confirm the Upload (API: `/api/upload/confirm`)**
- The frontend sends metadata (course code, professor name, year, file type, etc.) to the server
- The server checks for duplicates by comparing the MD5 hash
- If it's a duplicate, the row in Sheets is highlighted in orange
- The server writes a new record to `Sheet1` in Google Sheets with status = `pending_approval`
- If `requireModeration` is OFF: the file is immediately made public and moved to the approved folder
- If `requireModeration` is ON: the file stays in quarantine until an admin approves it
- The cache for that course is cleared so the new file will appear (once approved)
- An email notification is sent to all `MOD_EMAILS` addresses via Resend

**Step 5: Admin Approves the File (API: `/api/admin/approve`)**
- Admin sees the file in the "Pending Review" tab
- Admin clicks "Approve"
- The server:
  1. Resolves the correct subfolder path in Google Drive (e.g., `Core Courses → Sem 3 → BIO301 Cell Biology → Notes → Dr. Smith`)
  2. Creates these subfolders if they don't exist
  3. Moves the file from Quarantine to the correct folder
  4. Makes the file publicly accessible (anyone with the link can view)
  5. Creates a backup copy in the Backup folder
  6. Updates the status in Google Sheets from `pending_approval` to `approved`
  7. Clears the KV cache for that course

After this, the file appears on the course page for all students.

---

## 19. File Download Flow — Step by Step

Here is what happens when a student downloads a file:

**Step 1: Student Clicks Download on a Course Page**
- The course page shows a list of files fetched from `/api/files`
- Each file has a `driveWebViewLink` (the Google Drive viewing link)

**Step 2: Authentication Check (Frontend)**
- If `requireNiserToDownload` is ON, the student must be logged in with a `@niser.ac.in` email
- If they are not logged in, a login modal appears

**Step 3: Download API Call (API: `/api/download`)**
- The browser sends a POST request to `/api/download` with the `fileId` and `email`
- The server:
  1. Increments the `downloadCount` for that file in Google Sheets
  2. Logs the download to the `FileDownloads` tab (if `enableDownloadLogging` is ON)
  3. Records email, filename, timestamp, and user agent

**Step 4: Browser Opens the File**
- The browser opens the Google Drive link in a new tab
- The student can view or download the file from there

---

## 20. Caching System — Why Files Load Instantly

Without caching, every time a student opens a course page, the server would need to call Google Sheets. This would be slow (1–2 seconds per request).

With Cloudflare KV caching:
- First student to open a course page: server calls Google Sheets (takes ~500ms) and stores the result in KV
- All subsequent students: server returns the cached result from KV (takes ~10ms)
- Cache expires after 5 days, or when an admin approves/deletes a file

**The cache keys follow this naming pattern:**
- `files:BIO301:3` — files for course BIO301 in semester 3
- `files:approved:all` — all approved files (used by search)
- `notices:all` — all active notices
- `requests:all` — all file requests
- `books:3:BIO301` — textbooks for BIO301 in semester 3

**Relevant code file**: `src/lib/api-cache.ts`

The cache system has a fallback: if Cloudflare KV is not available (e.g., during local development), it uses an in-memory JavaScript Map as a temporary cache.

---

## 21. Deployment Guide — How to Deploy Changes

Whenever you change any code file or `wrangler.toml`, you must redeploy for the changes to go live.

### Prerequisites (one-time setup)

Make sure you have these installed:
1. **Node.js** (version 18 or higher) — download from https://nodejs.org
2. **Wrangler** — install by running: `npm install -g wrangler`
3. **Wrangler login** — run: `npx wrangler login` (a browser opens to authenticate)

### Step-by-Step Deployment

Open a terminal (PowerShell on Windows) and run these commands **in the project folder** (`e:\bioarchive v2\`):

```powershell
# Step 1: Make sure you are in the project folder
cd "e:\bioarchive v2"

# Step 2: Install dependencies (only needed first time or after package changes)
npm install

# Step 3: Build the project for Cloudflare
npx @cloudflare/next-on-pages

# Step 4: Deploy to Cloudflare Pages
npx wrangler pages deploy .vercel/output/static --project-name bioarchive
```

**Alternatively, use the npm script if it is defined:**
```powershell
npm run deploy
```

> ⚠️ **If Step 3 fails**, there is likely a TypeScript or code error. Read the error message carefully. Common issues:
> - A missing variable (check you saved the file)
> - A syntax error in the code

**After deploying:**
- Changes go live immediately
- Check the Cloudflare Dashboard to see the new deployment listed
- Wait 30 seconds and then test the website

---

## 22. Adding & Removing Admins

### Adding a New Admin (Full Steps)

1. Open `wrangler.toml` in a text editor (Notepad, VS Code, etc.)
2. File is at: `e:\bioarchive v2\wrangler.toml`
3. Find these two lines:
   ```toml
   ADMIN_EMAILS = "bioarchive007@gmail.com"
   NEXT_PUBLIC_ADMIN_EMAILS = "bioarchive007@gmail.com"
   ```
4. Add the new email (comma-separated, no spaces around the comma):
   ```toml
   ADMIN_EMAILS = "bioarchive007@gmail.com,newperson@gmail.com"
   NEXT_PUBLIC_ADMIN_EMAILS = "bioarchive007@gmail.com,newperson@gmail.com"
   ```
5. Save the file
6. Deploy (see [Section 21](#21-deployment-guide--how-to-deploy-changes))
7. Tell the new admin the `ADMIN_DELETE_TOKEN` (the token/password they will enter on `/admin`)

### Removing an Admin

1. Open `wrangler.toml`
2. Remove the email from both lines
3. Save and redeploy
4. Consider changing `ADMIN_DELETE_TOKEN` since the removed person knew it

### Emergency: Revoking All Admin Access

If you believe the admin token has been compromised:
1. Change `ADMIN_DELETE_TOKEN` in `wrangler.toml` immediately
2. Redeploy
3. The old token stops working instantly after deployment

---

## 23. Changing the Admin Password

The "Admin Password" is called `ADMIN_DELETE_TOKEN` in the code.

1. Open `wrangler.toml`
2. Change this line:
   ```toml
   ADMIN_DELETE_TOKEN = "OldPassword"
   ```
   to:
   ```toml
   ADMIN_DELETE_TOKEN = "YourNewPassword2026"
   ```
   Rules for the new password:
   - No spaces allowed
   - Use a mix of letters, numbers, and symbols (e.g., underscores, hyphens)
   - At least 12 characters long is recommended
   - Example: `BioArch_3944_Secure!`

3. Save the file
4. Redeploy
5. After deployment, go to the website and test that the new token works

---

## 24. Adding a New Course

Courses are NOT hardcoded in the website code. They are determined by what is in Google Sheets. However, the **semester grid on the homepage** does list semesters 1-8 plus "Advanced Courses" — this is defined in code.

### To add a new course so students can upload files:

1. When a student uploads a file, they type in the course code and course name during the upload process. There is no separate "course registry" — any course code works.
2. The file appears under whatever course code the uploader typed.
3. The URL for that course will be: `/course/[semester]/[courseCode]` (e.g., `/course/3/BIO301`)

### To add a semester beyond 1-8 (rarely needed):

1. Open `src/config/index.ts`
2. Find this line:
   ```typescript
   NISER_SEMESTERS: [1, 2, 3, 4, 5, 6, 7, 8] as const,
   ```
3. Add the new semester number (e.g., `9` for a 9th semester)
4. Save and redeploy

### To add a new file type category:

1. Open `src/config/index.ts`
2. Find the `FILE_CATEGORIES` section:
   ```typescript
   FILE_CATEGORIES: {
     qpaper: { label: 'Question Paper', emoji: '', colorHex: '#EF4444' },
     notes: { label: 'Notes', emoji: '', colorHex: '#3B82F6' },
     ...
   }
   ```
3. Add your new category in the same format
4. Save and redeploy

---

## 25. Managing Notices & Announcements

Notices appear on the `/notices` page and are stored in the `Notices` tab of Google Sheets.

### To add a new notice:

1. Open the Google Spreadsheet → `Notices` tab
2. Add a new row with these columns:
   - `id`: A unique ID (e.g., `notice-2026-01`)
   - `date`: Today's date (e.g., `2026-06-18`)
   - `title`: The notice headline
   - `content`: The full notice text
   - `type`: One of: `info`, `warning`, `success`, `error`
   - `active`: `TRUE` (to show it) or `FALSE` (to hide it)

### To deactivate (hide) a notice:

1. Find the notice row in the `Notices` tab
2. Change the value in the `active` column from `TRUE` to `FALSE`
3. The notice disappears from the website within 5 minutes (KV cache TTL for notices is 5 minutes)

### To delete a notice permanently:

1. Delete the entire row from the `Notices` tab in Google Sheets

---

## 26. DDoS & Abuse Protection

A DDoS (Distributed Denial of Service) attack is when many fake requests flood the website to make it crash. Cloudflare handles most of this automatically.

### Built-in Protections (Already Active)

- **Cloudflare CDN** — Absorbs traffic at Cloudflare's global network before it reaches the server
- **Edge Functions** — Because the code runs at "Edge", there is no single server to overwhelm
- **KV Caching** — Since most requests are served from cache, the Google Sheets API is not hammered even during high traffic

### Additional Steps You Should Take

1. **Enable Bot Fight Mode**:
   - Cloudflare Dashboard → your domain → Security → Bots → Enable "Bot Fight Mode"

2. **Set Rate Limiting Rules**:
   - Cloudflare Dashboard → Security → WAF → Rate Limiting Rules
   - Create a rule: "If more than 100 requests per minute from the same IP, block for 10 minutes"
   - This prevents one person from sending 1000 requests per second

3. **Enable Under Attack Mode (for emergencies)**:
   - If the site is actively being attacked, go to Cloudflare Dashboard → Overview
   - Click the "Security Level" dropdown and select "I'm Under Attack!"
   - This adds a JavaScript challenge to every visitor — real humans pass, bots fail

4. **Firewall Rules for Sensitive Endpoints**:
   - You can add a Cloudflare WAF rule that only allows specific countries to access `/admin`
   - Example: Block all countries except India from accessing `/admin`

---

## 27. Common Errors & How to Fix Them

### Error: "Invalid token" when logging into Admin Panel

**Cause**: You entered the wrong admin token (password), OR your Google session expired.

**Fix**:
1. Sign out and sign back in with your Google account first
2. Then enter the correct `ADMIN_DELETE_TOKEN` from `wrangler.toml`
3. If you still get the error, check that your email is in `ADMIN_EMAILS`

---

### Error: "Missing GOOGLE_REFRESH_TOKEN" or "Failed to refresh Google access token"

**Cause**: The Google refresh token has expired or been revoked.

**Fix**: See [Section 28](#28-google-credential-rotation--when-tokens-expire)

---

### Error: "Failed to fetch sheet headers" or Google Sheets errors

**Cause**: The Google access token cannot read the spreadsheet. Usually because:
- The refresh token has expired
- The spreadsheet permissions have changed
- The `SHEET_ID` is wrong

**Fix**:
1. Check that the spreadsheet ID in `wrangler.toml` is correct
2. Verify that the `bioarchive007@gmail.com` account has edit access to the spreadsheet
3. Rotate the Google credentials if needed (Section 28)

---

### Error: Files uploaded but not showing on the website

**Cause**: Either the file is still in "pending" status, or the KV cache is stale.

**Fix**:
1. Log into the Admin Panel and check the "Pending Review" tab — approve the file there
2. If the file is approved but still not showing, clear the KV cache:
   - Go to Cloudflare Dashboard → KV → BIOARCHIVE_CACHE
   - Delete the key for that course (e.g., `files:BIO301:3`)

---

### Error: "Duplicate binding" during deployment

**Cause**: The same environment variable is set in BOTH `wrangler.toml` AND Cloudflare Dashboard.

**Fix**:
1. Decide which place it should be (see [Section 15](#15-environment-variables--what-each-one-does))
2. Remove it from one place
3. Redeploy

---

### Error: "Contact form is not fully configured" (503 error)

**Cause**: `RESEND_API_KEY` or `MOD_EMAILS` is not set in the Cloudflare Dashboard environment variables.

**Fix**:
1. Go to Cloudflare Dashboard → Pages → bioarchive → Settings → Environment Variables
2. Add `RESEND_API_KEY` with your Resend API key
3. Add `MOD_EMAILS` with the moderator's email address(es)
4. Redeploy

---

### Error: Build fails with TypeScript errors

**Cause**: A code change introduced a syntax or type error.

**Fix**:
1. Open a terminal in the project folder
2. Run: `npx tsc --noEmit`
3. This shows exactly which file and line has the error
4. Fix the error in that file
5. Try building again

---

### Error: Admin page shows 404 even for admins

**Cause**: The middleware is blocking access because the login cookie is missing or expired.

**Fix**:
1. Make sure you are logged in with Google on the website first
2. The login must complete (cookie must be set) before navigating to `/admin`
3. If still failing, check `ADMIN_EMAILS` includes your email, then redeploy

---

### Error: "Uploads are currently disabled"

**Cause**: The `enableUploads` feature toggle is set to `false` in the `SiteConfig` sheet.

**Fix**: Either enable it through the Admin Panel, or change `false` to `true` in the `SiteConfig` sheet directly.

---

## 28. Google Credential Rotation — When Tokens Expire

The Google Refresh Token is valid as long as it is regularly used. If the `bioarchive007@gmail.com` account password is changed, or if tokens are revoked, you need to get a new refresh token.

### How to Get a New Refresh Token

You will need to use a tool called **OAuth 2.0 Playground** to generate a new token:

1. Go to https://developers.google.com/oauthplayground

2. In the top-right, click the settings gear icon (⚙). Check "Use your own OAuth credentials" and enter:
   - Client ID: (from Google Cloud Console)
   - Client Secret: (from Google Cloud Console)

3. In the left panel, under "Step 1", find and check:
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/spreadsheets`

4. Click "Authorize APIs" — a Google login popup appears.

5. **Sign in with `bioarchive007@gmail.com`**

6. Click "Exchange authorization code for tokens" in Step 2

7. You will see a new `refresh_token` in the response. Copy it.

8. Go to Cloudflare Dashboard → Pages → bioarchive → Settings → Environment Variables

9. Update `GOOGLE_REFRESH_TOKEN` with the new value

10. Redeploy the website

### How to Get a New Google Client ID and Secret (if the OAuth app was deleted)

1. Go to https://console.cloud.google.com
2. Select the project (or create a new one)
3. Go to APIs & Services → Credentials
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized redirect URIs (for local dev and for the playground)
7. Copy the new Client ID and Client Secret
8. Update them in Cloudflare Dashboard AND in `wrangler.toml` (for `NEXT_PUBLIC_GOOGLE_CLIENT_ID`)
9. Redeploy

---

## 29. How to Add a New Feature

If you want to add something new to the website (e.g., a new page, a new button), here is a safe way to do it without breaking anything.

### Adding a New Page

1. Create a new folder under `src/app/` with the page name (e.g., `src/app/mypage/`)
2. Create a file called `page.tsx` inside that folder
3. Write your React component in that file
4. The page is now accessible at `/mypage`

### Adding a New Feature Toggle

If your new feature should be controllable ON/OFF by admins:

1. Open `src/lib/sheets.ts`
2. Find the `getSiteConfig` function (around line 846)
3. Add your new feature key in the default config object:
   ```typescript
   const config: Record<string, boolean> = {
     // ... existing keys ...
     myNewFeature: true,  // <-- add this
   };
   ```

4. Open `src/app/admin/page.tsx`
5. Add the new toggle to the `config` state (line ~24):
   ```typescript
   const [config, setConfig] = useState({
     // ... existing ...
     myNewFeature: true,  // <-- add this
   });
   ```

6. Add a label for it in the `toggleGroups.features` array (line ~210):
   ```typescript
   { key: 'myNewFeature' as const, label: 'My New Feature', desc: 'What this does.' }
   ```

7. In your new feature's code, check the toggle:
   ```typescript
   const siteConfig = await getSiteConfig();
   if (siteConfig.myNewFeature === false) {
     // feature is disabled, return early or show message
   }
   ```

8. Save all files and redeploy

### Adding a New API Endpoint

1. Create a folder under `src/app/api/` (e.g., `src/app/api/myendpoint/`)
2. Create `route.ts` inside it
3. Start the file with `export const runtime = 'edge';`
4. Export an async function named `GET` or `POST` or both
5. The endpoint is now available at `/api/myendpoint`

**Important rules for new API code:**
- Always use `export const runtime = 'edge';` at the top
- Never use `fs`, `path`, or other Node.js disk-access modules
- All data access must be through HTTP (Google APIs, etc.)
- Always handle errors with try/catch and return proper HTTP status codes

---

## 30. What NOT to Touch

### Never Change These (without understanding fully)

| File / Setting | Why |
|---------------|-----|
| `src/middleware.ts` | This is the security gate. A wrong change could expose the admin page to everyone |
| Column order in `Sheet1` of Google Sheets | The code relies on specific column positions. Changing them breaks everything |
| `wrangler.toml` KV namespace ID | Points to the actual cache storage. Changing it disconnects the cache |
| `compatibility_date` and `compatibility_flags` in `wrangler.toml` | Cloudflare-specific settings. Changing `nodejs_compat` flag breaks many features |
| `pages_build_output_dir` in `wrangler.toml` | Tells Wrangler where to find the built files. Changing it breaks deployment |
| `src/lib/google-auth.ts` | Handles token refresh. Breaking this breaks all Google API calls |

### Never Do These

- **Never put `GOOGLE_CLIENT_SECRET` or `GOOGLE_REFRESH_TOKEN` in `wrangler.toml`** — these are secrets and must stay in the Cloudflare Dashboard
- **Never share the `ADMIN_DELETE_TOKEN` publicly** — keep it private
- **Never delete the `SiteConfig` sheet tab** in Google Sheets — the site breaks without it
- **Never rename `Sheet1`** — the code specifically reads from a tab called `Sheet1`
- **Never change the KV namespace in Cloudflare** without also updating `wrangler.toml` to match

---

## 31. Emergency Checklist

### If the Website is Down

1. Go to https://dash.cloudflare.com → Pages → bioarchive
2. Check if the latest deployment succeeded (green checkmark = success, red = failed)
3. If failed: click the failed deployment and read the build log to see the error
4. If succeeded but site is still down: check Cloudflare's status page at https://cloudflarestatus.com

### If Files Are Not Showing Up

1. Log into the Admin Panel and make sure the files are "approved" (not pending)
2. Check the KV cache — delete the relevant key (see [Section 12](#12-cloudflare--pages-kv-cache--workers))
3. Check the Google Spreadsheet to confirm the file records have status = `approved`

### If No One Can Log In

1. Check that `restrictToInstitutionalEmail` in SiteConfig is correctly set
2. Check that the Google OAuth Client ID is correct in `wrangler.toml`
3. Check Cloudflare Dashboard for the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` variables

### If Email Notifications Stop Working

1. Go to https://resend.com and check if the API key is still valid
2. Check the Cloudflare Dashboard environment variables for `RESEND_API_KEY` and `MOD_EMAILS`
3. Generate a new API key on Resend and update it in Cloudflare Dashboard
4. Redeploy

### If You Suspect the Admin Password is Leaked

1. Immediately open `wrangler.toml`
2. Change `ADMIN_DELETE_TOKEN` to a new strong password
3. Save and deploy immediately
4. Inform all admins of the new password

### If Google APIs Stop Working (Refresh Token Expired)

See [Section 28](#28-google-credential-rotation--when-tokens-expire) for the full step-by-step guide.

---

## Quick Reference — Key IDs and Links

| Item | Value / Link |
|------|-------------|
| **Website URL** | https://bioarchive.pages.dev (or your custom domain) |
| **Admin Panel** | /admin |
| **Google Spreadsheet** | https://docs.google.com/spreadsheets/d/1-SEUn_HG62-T06ZRV_vkeHZ5eDTOi4Fuu566KvDDMOo |
| **Google Drive Main Folder** | ID: `1AcpuO4CFHMAttp1gYOgjJH7GbOnQg9ve` |
| **Google Drive Quarantine** | ID: `1_WpOQsN42kn5mbrz2rwEpdViucTYvWVX` |
| **Cloudflare Dashboard** | https://dash.cloudflare.com |
| **Cloudflare Pages** | Pages → bioarchive |
| **Cloudflare KV Cache** | Workers & Pages → KV → BIOARCHIVE_CACHE |
| **Resend Dashboard** | https://resend.com |
| **Google Cloud Console** | https://console.cloud.google.com |
| **Google Analytics** | https://analytics.google.com (ID: G-CZS52D25M3) |
| **Master Admin Account** | bioarchive007@gmail.com |
| **Admin Token (current)** | TheONE_393 *(change this)* |

---

*This guide was written to cover every important aspect of BioArchive so you can maintain it confidently even without deep coding knowledge. When in doubt, search this document first. For issues not covered here, read the code comments — they are written in plain English to explain what each function does.*

*Last updated: June 2026*
