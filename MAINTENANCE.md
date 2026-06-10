# Maintenance and Operations Guide

This document describes routine maintenance tasks, operations, and troubleshooting steps for BioArchive v2.

---

### How to Add a New Course
1. Open and edit [curriculum.ts](file:///e:/bioarchive%20v2/src/data/curriculum.ts).
2. Locate the corresponding semester object (or `ADVANCE COURSES`).
3. Add a new `Course` entry with the code, name, and professors.
4. Add a course icon PNG file named after the course code (in lowercase) to the `public/courseicons/` folder (e.g., `public/courseicons/b201.png`).
5. Commit and push the changes to your Git repository. Cloudflare Pages auto-deploys upon push.

---

### How to Change the Google Account
To swap or update the Google account connected to Google Drive and Google Sheets:
1. Generate a new set of OAuth credentials (`clientId`, `clientSecret`, and `refreshToken`) for the new account using the Google Cloud Console.
2. In the Cloudflare Dashboard, go to **Pages** → **bioarchive** → **Settings** → **Environment Variables**.
3. Update the values of `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`.
4. Redeploy the Pages project to apply changes. Changing the credentials here is the only place required.

---

### How to Change the Google Drive Folder
To change the target directory where uploaded files are permanently saved:
1. Create a new folder in Google Drive.
2. Share the folder/permissions if necessary, and copy its Folder ID from the URL.
3. In the Cloudflare Dashboard, update the value of `DRIVE_FOLDER_ID` under environment variables.

---

### How to Delete a File
If a file needs to be deleted from BioArchive, make a `POST` request to the `/api/delete` endpoint:
- **URL**: `/api/delete`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "fileId": "the-sheets-file-id-or-hash",
    "driveFileId": "the-google-drive-file-id",
    "adminToken": "your_secret_admin_delete_token_here"
  }
  ```
This endpoint atomically:
1. Deletes the file from Google Drive.
2. Deletes the corresponding row from Google Sheets.
3. Invalidates the KV cache.

---

### How to Check for Duplicates in Quarantine
During upload, if a file checksum matches an existing registry record:
1. The file is placed in quarantine instead of the main folder to prevent duplicates.
2. To inspect or resolve quarantined items, log in to Google Drive and open the Quarantine folder (ID configured via `DRIVE_QUARANTINE_FOLDER_ID`).
3. Manually delete or review quarantined files.

---

### How to Add a Moderator Email
To configure who receives Resend email notifications upon new file uploads:
1. Go to Cloudflare Dashboard → **Pages** → **bioarchive** → **Settings** → **Environment Variables**.
2. Locate or add `MOD_EMAILS`.
3. Set the value to a comma-separated list of moderator emails (e.g., `moderator1@niser.ac.in,moderator2@niser.ac.in`).
4. **Sender Email / Resend Sandbox Limitations:**
   * By default, emails are sent via Resend's test sandbox (`onboarding@resend.dev`). In sandbox mode, **emails can ONLY be sent to the email address that registered the Resend account**.
   * To send notifications to moderators' custom emails (e.g. `@niser.ac.in`), you **must verify your domain** on Resend (see DNS verification guide below).
   * After verification, set `SENDER_EMAIL` environment variable in Cloudflare settings to a verified sender (e.g., `BioArchive <noreply@bioarchive.in>`).

---

### KV Cache TTL & Missing Uploads
The Cloudflare KV store caches Google Sheets files lists for **5 minutes** to optimize Sheets API limits.
- If a user uploads a file and it doesn't immediately show up in the course list, they should wait **5 minutes** for the cache to expire.
- Alternatively, you can manually purge the KV keys starting with `files:` via the **Cloudflare Dashboard** → **KV** namespace.

---



### Google Sheets Quota
The Google Sheets REST API has a default free usage tier quota (typically **300 read requests per minute**).
- Since BioArchive implements aggressive Cloudflare KV caching for all course files lists (`files:${courseCode}:${semester}`), most client traffic will bypass Google Sheets entirely.
- Direct read requests to Google Sheets occur only on KV cache misses (once every 5 minutes per course).

---

### Google Drive Unlimited Storage Option
If the Google account running BioArchive reaches its free 15GB limit, you can easily set up unlimited or high-capacity storage:
1. **Institutional Google Workspace (NISER Account):**
   * If you have a NISER institutional Google account, it usually comes with significantly higher storage limits (often 100GB to 5TB or more depending on organization rules).
   * Create a folder inside your NISER Google Drive, share it with the service account or authorize the OAuth app under this institutional account, and update `DRIVE_FOLDER_ID` to this folder's ID.
2. **Google Shared Drives (Team Drives):**
   * Go to Google Drive using your institutional account and click on **Shared Drives** on the left.
   * Create a new Shared Drive (which has separate high storage capacity, typically 250,000 files/folders limit).
   * Create a folder inside the Shared Drive, copy its Folder ID, and set it as `DRIVE_FOLDER_ID`.
   * Ensure the Google Account connected to the app has **Manager** or **Content Manager** access to this Shared Drive.

---

### How to Post Announcements on the Notice Board
To update or post notices to the `/board` section:
1. Open the Google Sheet registry (configured via `SHEET_ID`).
2. Switch to the **`Notices`** tab. (If it does not exist, navigate to `/board` once on the website to initialize it, or create a sheet named `Notices` with headers: `id`, `date`, `title`, `content`, `type`, `active`).
3. Add a row:
   * **`id`**: A unique text string (e.g. `notice-1`, `notice-2`).
   * **`date`**: Date of posting (e.g. `2026-06-10`).
   * **`title`**: Heading of the announcement.
   * **`content`**: Body text of the notice.
   * **`type`**: Set to `info` (green), `warning` (red), or `update` (gold).
   * **`active`**: Set to `TRUE` to display it, or `FALSE` to hide/archive it.
4. Notices update instantly (subject to a 5-minute cache TTL).
