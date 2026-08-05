import { fetchWithTimeout } from './utils';

const fetch = fetchWithTimeout;

/**
 * Universal email helper.
 * Routes email via Brevo if BREVO_API_KEY is configured.
 * If Brevo fails or is unconfigured, automatically falls back to Resend if RESEND_API_KEY is configured.
 */
async function sendEmailHelper(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: string }> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const errors: string[] = [];

  // 1. Try Brevo first
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

      if (res.ok) {
        console.log('[notify] Email delivered via Brevo.');
        return { success: true };
      }
      const errText = await res.text();
      const errMessage = `Brevo API error (${res.status}): ${errText}`;
      errors.push(errMessage);
      console.warn(`[notify] Brevo failed (${res.status}), attempting fallback to Resend if configured...`);
    } catch (err: any) {
      errors.push(`Brevo exception: ${err.message}`);
      console.warn(`[notify] Brevo exception: ${err.message}, attempting fallback to Resend if configured...`);
    }
  }

  // 2. Fallback to Resend
  if (resendKey) {
    try {
      // Resend requires verified domain unless using onboarding@resend.dev
      let fromEmail = 'BioArchive <onboarding@resend.dev>';
      const envSender = process.env.SENDER_EMAIL || '';
      if (envSender && !envSender.endsWith('@gmail.com') && !envSender.endsWith('@yahoo.com') && !envSender.endsWith('@hotmail.com')) {
        fromEmail = `BioArchive <${envSender}>`;
      }

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: params.to,
          subject: params.subject,
          html: params.html,
        }),
      });

      if (res.ok) {
        console.log('[notify] Email delivered via Resend fallback.');
        return { success: true };
      }
      const errText = await res.text();
      errors.push(`Resend API error (${res.status}): ${errText}`);
    } catch (err: any) {
      errors.push(`Resend exception: ${err.message}`);
    }
  }

  const combinedError = errors.length > 0
    ? errors.join(' | ')
    : 'No email service API keys configured (BREVO_API_KEY or RESEND_API_KEY).';

  return { success: false, error: combinedError };
}

/**
 * Sends an email notification to moderators/admins about a new upload batch.
 * Never throws — errors are silently logged.
 */
export async function notifyModsOfUpload(metadata: {
  fileNames: string[];
  courseCode: string;
  courseName: string;
  semester: string;
  uploaderName: string;
  fileType: string;
  remarks?: string;
}): Promise<void> {
  try {
    const modEmails = process.env.MOD_EMAILS || process.env.ADMIN_EMAILS || 'bioarchive007@gmail.com';
    if (!modEmails) {
      console.warn('[notify] MOD_EMAILS / ADMIN_EMAILS not configured, skipping notification.');
      return;
    }

    const recipients = modEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    const subject = metadata.fileNames.length === 1
      ? `[BioArchive] New upload: ${metadata.fileNames[0]}`
      : `[BioArchive] New uploads: ${metadata.fileNames.length} files for ${metadata.courseCode}`;

    const filesListHtml = metadata.fileNames.map(f => `<li><strong>${f}</strong></li>`).join('');
    const remarksHtml = metadata.remarks ? `
      <tr style="border-bottom:1px solid #edf2f7;">
        <td style="padding:10px;font-weight:bold;color:#64748b;">Remarks</td>
        <td style="padding:10px;font-style:italic;color:#444;">${metadata.remarks}</td>
      </tr>
    ` : '';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
        <div style="background:#090d16;padding:24px;text-align:center;border-bottom:3px solid #daa520;">
          <h1 style="color:#daa520;font-family:'Georgia',serif;font-size:22px;margin:0 0 6px 0;letter-spacing:0.5px;">BioArchive</h1>
          <p style="color:#94a3b8;font-size:13px;margin:0;">Moderator Notification — New File Upload</p>
        </div>
        <div style="padding:24px;">
          <p style="font-size:15px;color:#334155;margin-top:0;">A new submission has been received and is waiting for moderator review:</p>
          <table style="border-collapse:collapse;width:100%;font-size:14px;color:#334155;background:#f8fafc;border-radius:8px;overflow:hidden;margin-bottom:20px;">
            <tr style="border-bottom:1px solid #edf2f7;"><td style="padding:10px;font-weight:bold;width:120px;color:#64748b;">Course</td><td style="padding:10px;"><strong>${metadata.courseCode}</strong> — ${metadata.courseName}</td></tr>
            <tr style="border-bottom:1px solid #edf2f7;"><td style="padding:10px;font-weight:bold;color:#64748b;">Semester</td><td style="padding:10px;">${metadata.semester}</td></tr>
            <tr style="border-bottom:1px solid #edf2f7;"><td style="padding:10px;font-weight:bold;color:#64748b;">Type</td><td style="padding:10px;text-transform:capitalize;">${metadata.fileType}</td></tr>
            <tr style="border-bottom:1px solid #edf2f7;"><td style="padding:10px;font-weight:bold;color:#64748b;">Uploader</td><td style="padding:10px;">${metadata.uploaderName || 'Anonymous'}</td></tr>
            ${remarksHtml}
            <tr>
              <td style="padding:10px;font-weight:bold;vertical-align:top;color:#64748b;">File(s)</td>
              <td style="padding:10px;">
                <ul style="margin:0;padding-left:18px;line-height:1.6;color:#1e293b;">
                  ${filesListHtml}
                </ul>
              </td>
            </tr>
          </table>
          <div style="text-align:center;margin-top:28px;">
            <a href="https://bioarchive.pages.dev/admin" style="background:#10b981;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;box-shadow:0 2px 6px rgba(16,185,129,0.3);">
              Open Moderation Panel to Review & Approve
            </a>
          </div>
        </div>
        <div style="background:#f1f5f9;padding:14px 24px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
          BioArchive Automated Notification System
        </div>
      </div>
    `;

    const result = await sendEmailHelper({ to: recipients, subject, html });
    if (!result.success) {
      console.error(`[notify] Failed to send upload notification: ${result.error}`);
    } else {
      console.log(`[notify] Sent batch upload notification email to ${recipients.join(', ')}.`);
    }
  } catch (err) {
    console.error('[notify] Failed to send notification:', err);
  }
}
