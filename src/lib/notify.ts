import { fetchWithTimeout } from './utils';

const fetch = fetchWithTimeout;

/**
 * Universal email helper.
 * Routes email via Brevo if BREVO_API_KEY is configured,
 * otherwise falls back to Resend if RESEND_API_KEY is configured.
 */
async function sendEmailHelper(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (brevoKey) {
    try {
      const senderEmail = process.env.SENDER_EMAIL || 'bioarchive007@gmail.com';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'BioArchive', email: senderEmail },
          to: params.to.map((email) => ({ email })),
          subject: params.subject,
          htmlContent: params.html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Brevo API error: ${res.statusText} - ${errText}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (resendKey) {
    try {
      const senderEmail = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail,
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: `Resend API error: ${res.statusText} - ${errText}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: 'No email service API keys configured (BREVO_API_KEY or RESEND_API_KEY).' };
}

/**
 * Sends an email notification to moderators about a new upload batch.
 * Never throws — errors are silently logged.
 */
export async function notifyModsOfUpload(metadata: {
  fileNames: string[];
  courseCode: string;
  courseName: string;
  semester: string;
  uploaderName: string;
  fileType: string;
}): Promise<void> {
  try {
    const modEmails = process.env.MOD_EMAILS;
    if (!modEmails) {
      console.warn('[notify] MOD_EMAILS not configured, skipping notification.');
      return;
    }

    const recipients = modEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    const subject = metadata.fileNames.length === 1
      ? `[BioArchive] New upload: ${metadata.fileNames[0]}`
      : `[BioArchive] New uploads: ${metadata.fileNames.length} files for ${metadata.courseCode}`;

    const filesListHtml = metadata.fileNames.map(f => `<li>${f}</li>`).join('');
    const html = `
      <h2>New Materials Uploaded to BioArchive</h2>
      <table style="border-collapse:collapse;width:100%;max-width:600px;font-family:sans-serif;font-size:14px;color:#333;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;width:120px;color:#666;">Course</td><td style="padding:8px;">${metadata.courseCode} — ${metadata.courseName}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Semester</td><td style="padding:8px;">${metadata.semester}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Type</td><td style="padding:8px;">${metadata.fileType}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Uploader</td><td style="padding:8px;">${metadata.uploaderName}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;vertical-align:top;color:#666;">File(s)</td><td style="padding:8px;">
          <ul style="margin:0;padding-left:20px;line-height:1.6;">
            ${filesListHtml}
          </ul>
        </td></tr>
      </table>
    `;

    const result = await sendEmailHelper({ to: recipients, subject, html });
    if (!result.success) {
      console.error(`[notify] Failed to send upload notification: ${result.error}`);
    } else {
      console.log(`[notify] Sent batch upload email for ${metadata.fileNames.length} files.`);
    }
  } catch (err) {
    console.error('[notify] Failed to send notification:', err);
  }
}


/**
 * Sends a book request notification email to the admin (bioarchive007@gmail.com)
 * with one-click Allow and Deny links.
 * Never throws — errors are silently logged.
 */
export async function notifyAdminOfBookRequest(params: {
  requestId: string;
  name: string;
  email: string;
  semester: string;
  courseCode: string;
  courseName: string;
  bookName: string;
  isNewBook: boolean;
  author?: string;
  edition?: string;
  driveFileId?: string;       // set if book already exists in Drive
  driveFolderLink?: string;   // set if book is new — links admin to upload location
  baseUrl: string;            // e.g. "https://bioarchive.pages.dev"
}): Promise<void> {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'bioarchive007@gmail.com';

    const allowUrl = `${params.baseUrl}/api/books/approve?id=${params.requestId}&action=allow`;
    const denyUrl  = `${params.baseUrl}/api/books/approve?id=${params.requestId}&action=deny`;

    const bookSection = params.isNewBook
      ? `
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Book Title</td><td style="padding:8px;"><strong>${params.bookName}</strong></td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Author(s)</td><td style="padding:8px;">${params.author || '—'}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Edition</td><td style="padding:8px;">${params.edition || '—'}</td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">📁 Upload Folder</td><td style="padding:8px;">
          ${params.driveFolderLink
            ? `<a href="${params.driveFolderLink}" style="color:#10b981;font-weight:bold;">Open Drive Folder →</a><br><small style="color:#888;">Upload the book PDF here, then click Allow below.</small>`
            : '<em style="color:#888;">Folder link unavailable — check Drive manually.</em>'
          }
        </td></tr>
      `
      : `
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Book</td><td style="padding:8px;"><strong>${params.bookName}</strong></td></tr>
        <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Drive File ID</td><td style="padding:8px;font-size:12px;color:#888;">${params.driveFileId || '—'}</td></tr>
      `;

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
        <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#030a18,#0d2042);padding:28px 32px;">
            <h1 style="margin:0;color:#d4a853;font-size:1.3rem;letter-spacing:0.04em;">📚 BioArchive</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:0.85rem;">Book Access Request — Action Required</p>
          </div>
          <div style="padding:28px 32px;">
            <h2 style="margin:0 0 20px;color:#1a1a2e;font-size:1.05rem;">A student has requested a reference book.</h2>
            <table style="border-collapse:collapse;width:100%;font-size:14px;color:#333;">
              <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;width:130px;color:#666;">Student Name</td><td style="padding:8px;">${params.name}</td></tr>
              <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Student Email</td><td style="padding:8px;">${params.email}</td></tr>
              <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Semester</td><td style="padding:8px;">Sem ${params.semester}</td></tr>
              <tr style="border-bottom:1px solid #eee;"><td style="padding:8px;font-weight:bold;color:#666;">Course</td><td style="padding:8px;">${params.courseCode} — ${params.courseName}</td></tr>
              ${bookSection}
              <tr><td style="padding:8px;font-weight:bold;color:#666;">Request Type</td><td style="padding:8px;">${params.isNewBook ? '<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:12px;">📦 New Book</span>' : '<span style="background:#d1fae5;color:#065f46;padding:2px 8px;border-radius:4px;font-size:12px;">✅ Existing Book</span>'}</td></tr>
            </table>

            <div style="margin-top:28px;display:flex;gap:12px;">
              <a href="${allowUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:0.9rem;margin-right:12px;">
                ✅ Allow — Send Book to Student
              </a>
              <a href="${denyUrl}" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:0.9rem;">
                ❌ Deny Request
              </a>
            </div>
            <p style="margin-top:16px;font-size:0.75rem;color:#999;">
              Request ID: <code>${params.requestId}</code> · Clicking Allow will automatically share the book's Google Drive link with the student.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmailHelper({
      to: [adminEmail],
      subject: `[BioArchive] Book Request: "${params.bookName}" — ${params.name}`,
      html,
    });

    if (!result.success) {
      console.error(`[notify] Failed to send book request admin email: ${result.error}`);
    } else {
      console.log(`[notify] Book request admin notification sent for request ${params.requestId}.`);
    }
  } catch (err) {
    console.error('[notify] Failed to send book request notification:', err);
  }
}

/**
 * Notifies the student that their book request was approved.
 * Sends a link to the /my-books page where they can securely download the book
 * (avoids sending a raw Drive link in email, keeps access auth-gated).
 * Never throws — errors are silently logged.
 */
export async function notifyUserOfBookApproval(params: {
  name: string;
  email: string;
  bookName: string;
  courseCode: string;
  myBooksUrl: string;   // e.g. https://bioarchive.pages.dev/my-books
  expiresAt: string;    // ISO timestamp, shown to user
}): Promise<void> {
  try {
    const expiryDate = new Date(params.expiresAt).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
        <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#030a18,#0d2042);padding:28px 32px;">
            <h1 style="margin:0;color:#d4a853;font-size:1.3rem;letter-spacing:0.04em;">📚 BioArchive</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:0.85rem;">Your book request has been approved</p>
          </div>
          <div style="padding:28px 32px;">
            <p style="color:#1a1a2e;font-size:0.95rem;">Hi <strong>${params.name}</strong>,</p>
            <p style="color:#444;line-height:1.7;font-size:0.9rem;">
              Great news! Your request for a reference book has been approved.
              Visit your <strong>My Book Library</strong> to download it — you'll need to sign in with your NISER Google account.
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:20px 0;">
              <p style="margin:0 0 4px;font-size:0.8rem;color:#065f46;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em;">📖 Approved Book</p>
              <p style="margin:0 0 4px;font-size:1rem;font-weight:bold;color:#1a1a2e;">${params.bookName}</p>
              <p style="margin:0 0 8px;font-size:0.8rem;color:#666;">Course: ${params.courseCode}</p>
              <p style="margin:0;font-size:0.78rem;color:#b45309;">⏳ Available until: <strong>${expiryDate} IST</strong></p>
            </div>
            <a href="${params.myBooksUrl}" style="display:block;text-align:center;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:0.95rem;">
              📥 Open My Book Library
            </a>
            <p style="margin-top:16px;font-size:0.78rem;color:#999;line-height:1.6;">
              Sign in with your NISER Google account to access and download your book.<br>
              The download link will be automatically removed after 3 days.
            </p>
          </div>
          <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:0.72rem;color:#aaa;">BioArchive · NISER School of Biological Sciences</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmailHelper({
      to: [params.email],
      subject: `[BioArchive] Your book is ready: ${params.bookName}`,
      html,
    });

    if (!result.success) {
      console.error(`[notify] Failed to send user book approval email: ${result.error}`);
    } else {
      console.log(`[notify] Book approval email sent to ${params.email}.`);
    }
  } catch (err) {
    console.error('[notify] Failed to send book approval notification:', err);
  }
}


/**
 * Notifies the student that their book request was denied.
 * Never throws — errors are silently logged.
 */
export async function notifyUserOfBookDenial(params: {
  name: string;
  email: string;
  bookName: string;
}): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f4f4f5;font-family:sans-serif;">
        <div style="max-width:580px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <div style="background:linear-gradient(135deg,#030a18,#0d2042);padding:28px 32px;">
            <h1 style="margin:0;color:#d4a853;font-size:1.3rem;letter-spacing:0.04em;">📚 BioArchive</h1>
          </div>
          <div style="padding:28px 32px;">
            <p style="color:#1a1a2e;">Hi <strong>${params.name}</strong>,</p>
            <p style="color:#444;line-height:1.7;font-size:0.9rem;">
              We were unable to fulfill your request for <strong>${params.bookName}</strong> at this time.
              This may be due to copyright restrictions or the book not being available in our archive.
              You may try requesting it again later or consult your course instructor for alternatives.
            </p>
            <p style="margin-top:24px;font-size:0.78rem;color:#999;">
              BioArchive · NISER School of Biological Sciences
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await sendEmailHelper({
      to: [params.email],
      subject: `[BioArchive] Update on your book request: ${params.bookName}`,
      html,
    });

    if (!result.success) {
      console.error(`[notify] Failed to send book denial notification: ${result.error}`);
    }
  } catch (err) {
    console.error('[notify] Failed to send book denial notification:', err);
  }
}
