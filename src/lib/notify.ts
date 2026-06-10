/**
 * Email notification helper using Resend API.
 * All functions are fire-and-forget — they catch and log errors internally.
 */

/**
 * Sends an email notification to moderators about a new upload.
 * Never throws — errors are silently logged.
 */
export async function notifyModsOfUpload(metadata: {
  fileName: string;
  courseCode: string;
  courseName: string;
  semester: string;
  uploaderName: string;
  fileType: string;
}): Promise<void> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const modEmails = process.env.MOD_EMAILS;

    if (!apiKey || !modEmails) {
      console.warn('[notify] RESEND_API_KEY or MOD_EMAILS not configured, skipping notification.');
      return;
    }

    const recipients = modEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.SENDER_EMAIL || 'BioArchive <onboarding@resend.dev>',
        to: recipients,
        subject: `[BioArchive] New upload: ${metadata.fileName}`,
        html: `
          <h2>📁 New File Uploaded to BioArchive</h2>
          <table style="border-collapse:collapse;">
            <tr><td style="padding:4px 12px;font-weight:bold;">File</td><td style="padding:4px 12px;">${metadata.fileName}</td></tr>
            <tr><td style="padding:4px 12px;font-weight:bold;">Course</td><td style="padding:4px 12px;">${metadata.courseCode} — ${metadata.courseName}</td></tr>
            <tr><td style="padding:4px 12px;font-weight:bold;">Semester</td><td style="padding:4px 12px;">${metadata.semester}</td></tr>
            <tr><td style="padding:4px 12px;font-weight:bold;">Type</td><td style="padding:4px 12px;">${metadata.fileType}</td></tr>
            <tr><td style="padding:4px 12px;font-weight:bold;">Uploader</td><td style="padding:4px 12px;">${metadata.uploaderName}</td></tr>
          </table>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[notify] Resend API error: ${res.statusText} - ${err}`);
    }
  } catch (err) {
    console.error('[notify] Failed to send notification:', err);
  }
}
