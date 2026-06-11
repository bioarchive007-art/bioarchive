# BioArchive Backend Features Reference

This document summarizes the core backend features of BioArchive, details the API routes handling them, and lists the fields processed.

---

## 1. Upload Session Initialization
* **Endpoint:** `POST /api/upload/session` (Edge Runtime)
* **How it works:** Validates metadata, checks for existing duplicate sheets entries, generates a standardized canonical filename, and creates a Google Drive resumable upload session URL.
* **Fields Processed:**
  * `fileName` *(string, required)*: Original upload name.
  * `fileSize` *(number, required)*: Size in bytes (max 500 MB).
  * `mimeType` *(string, required)*: File MIME type (restricted to PDF, PPT, PPTX, DOCX, XLSX, ZIP, PNG, JPG, JPEG).
  * `courseCode` & `courseName` *(string, required)*: Targeted course identifier.
  * `semester` *(string, required)*: Course semester mapping (e.g. `1` to `8`, or `ADVANCE COURSES`).
  * `fileType` *(string, required)*: Material category (`qpaper`, `notes`, `slides`, `lab`, `assignment`, `other`).
  * `examType` *(string, conditional)*: Sub-type if category is `qpaper` (`Mid-Semester`, `End-Semester`, `Quiz`, etc.).
  * `year` *(string/number, required)*: Year of exam/material (must be 4-digit number and <= current year).
  * `professor`, `professor2`, `professor3` *(string, optional)*: Instructors' names.
  * `uploaderName` *(string, optional)*: Uploader profile display name.
  * `remarks` *(string, optional)*: Free-form upload notes.

## 2. Proxy Upload Streaming
* **Endpoint:** `PUT /api/upload/drive` (Edge Runtime)
* **How it works:** Serves as a server-side proxy forwarding client upload chunks directly to Google Drive's resumable upload endpoint to prevent CORS issues.
* **Fields Processed:**
  * `X-Upload-Url` *(Header, required)*: Google Drive resumable upload session URL.
  * `Content-Type` *(Header, required)*: MIME type of the file.
  * `Body` *(ArrayBuffer, required)*: Raw binary file payload.

## 3. Upload Confirmation & Sheet Registry
* **Endpoint:** `POST /api/upload/confirm` (Edge Runtime)
* **How it works:** Fulfills the upload confirmation. Saves the metadata record in Google Sheets under `Sheet1`, updates the notice board if this upload resolves a user request, and invalidates Cloudflare KV cache.
* **Fields Processed:**
  * `driveFileId` *(string, required)*: Uploaded file ID from Google Drive.
  * `canonicalFileName` *(string, required)*: Structured name generated for the file.
  * `mimeType` & `r2Key` *(string)*: Resource specifications.
  * `metadata` *(object, required)*: Upload metadata payload saved to Google Sheet headers:
    * `fileId`, `semester`, `year`, `courseCode`, `courseName`, `professor`, `professor2`, `professor3`, `examType`, `fileType`, `fileName`, `uploaderName`, `uploadDate`, `md5Hash`, `driveWebViewLink`, `downloadCount`, `remarks`.

## 4. File Retrieval & Caching
* **Endpoint:** `GET /api/files` (Edge Runtime)
* **How it works:** Reads material files filtered by course and semester. Queries Google Sheets database and caches response in Cloudflare KV cache for 1 minute (`files:COURSECODE:SEMESTER`) to minimize Sheet API read quota hits.
* **Fields Processed:**
  * `courseCode` *(Query param, required)*: Selected course.
  * `semester` *(Query param, required)*: Target semester.

## 5. Download Counter Increment
* **Endpoint:** `GET /api/download` (Edge Runtime)
* **How it works:** Increments the `downloadCount` registry cell in Google Sheets for a specific file, then redirects the client to the Google Drive preview link.
* **Fields Processed:**
  * `fileId` *(Query param, required)*: The Sheet registry `fileId`.
  * `driveFileId` *(Query param, required)*: The target Google Drive resource identifier.

## 6. Textbook Hosting Listing
* **Endpoint:** `GET /api/books` (Edge Runtime)
* **How it works:** Queries semester-specific subfolders under the configured `BOOKS_DRIVE_FOLDER_ID` in Google Drive. Caches results in Cloudflare KV (`books:SEMESTER`) for 5 minutes.
* **Fields Processed:**
  * `semester` *(Query param, required)*: Target semester key.

## 7. Textbook Download Redirect & Sheet Logging
* **Endpoint:** `GET /api/books/download` (Edge Runtime)
* **How it works:** Logs access events into a `BookDownloads` sheet tab (Timestamp, Book Name, Course Code, Semester, File ID, User Agent) and redirects the client to the Google Drive PDF viewer.
* **Fields Processed:**
  * `fileId` *(Query param, required)*: Google Drive file ID.
  * `bookName` *(Query param, required)*: Textbook title.
  * `courseCode` & `semester` *(Query param, required)*: Matching curriculum details.
  * `User-Agent` *(Header, required)*: Web browser user agent string.

## 8. Material Requests API
* **Endpoints:**
  * `GET /api/requests` - Fetches pending requests list from `Requests` tab.
  * `POST /api/requests` - Submits a request to the notice board.
* **Fields Processed (POST):**
  * `courseCode` & `courseName` *(string, required)*: Targeted course.
  * `semester` *(string, required)*: Associated course semester.
  * `year` *(string, required)*: Year requested (validated: must be 4-digit and not in the future).
  * `fileType` *(string, required)*: Material type category.
  * `uploaderName` *(string, required)*: Requesting user name.
  * `remarks` *(string, optional)*: Details about the request.

## 9. Notice Board API
* **Endpoint:** `GET /api/notices` (Edge Runtime)
* **How it works:** Fetches active notice entries from the `Notices` sheet tab.
* **Fields Returned:**
  * `id`, `date`, `title`, `content`, `type`, `active`.

## 10. Contact Delivery Mailer
* **Endpoint:** `POST /api/contact` (Edge Runtime)
* **How it works:** Sends email notifications from contact form submissions to site administrators using the Resend SDK.
* **Fields Processed:**
  * `name` *(string, required)*: Sender's name.
  * `email` *(string, required)*: Sender's contact email.
  * `subject` *(string, required)*: Subject header.
  * `message` *(string, required)*: Message content body.
