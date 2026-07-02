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
