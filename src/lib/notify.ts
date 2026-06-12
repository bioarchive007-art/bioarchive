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
    const apiKey = process.env.RESEND_API_KEY;
    const modEmails = process.env.MOD_EMAILS;

    if (!apiKey || !modEmails) {
      console.warn('[notify] RESEND_API_KEY or MOD_EMAILS not configured, skipping notification.');
      return;
    }

    const recipients = modEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) return;

    const subject = metadata.fileNames.length === 1
      ? `[BioArchive] New upload: ${metadata.fileNames[0]}`
      : `[BioArchive] New uploads: ${metadata.fileNames.length} files for ${metadata.courseCode}`;

    const filesListHtml = metadata.fileNames.map(f => `<li>${f}</li>`).join('');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.SENDER_EMAIL || 'onboarding@resend.dev',
        to: recipients,
        subject: subject,
        html: `
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
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error(`[notify] Resend API error: ${res.statusText} - ${err}`);
    } else {
      console.log(`[notify] Successfully sent batch upload email for ${metadata.fileNames.length} files.`);
    }
  } catch (err) {
    console.error('[notify] Failed to send notification:', err);
  }
}
