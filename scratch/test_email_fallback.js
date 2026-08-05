const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)\s*$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

async function sendEmailHelper(params) {
  const brevoKey = env.BREVO_API_KEY;
  const resendKey = env.RESEND_API_KEY;
  const errors = [];

  // Try Brevo first if configured
  if (brevoKey) {
    try {
      const senderEmail = env.SENDER_EMAIL || 'bioarchive007@gmail.com';
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
        console.log('[notify] Sent email via Brevo successfully.');
        return { success: true };
      }
      const errText = await res.text();
      errors.push(`Brevo error (${res.status}): ${errText}`);
      console.warn(`[notify] Brevo failed, falling back to Resend if available. Error: ${errText}`);
    } catch (err) {
      errors.push(`Brevo exception: ${err.message}`);
      console.warn(`[notify] Brevo exception, falling back to Resend: ${err.message}`);
    }
  }

  // Fallback to Resend
  if (resendKey) {
    try {
      // Resend requires verified domain unless using onboarding@resend.dev
      let fromEmail = 'BioArchive <onboarding@resend.dev>';
      if (env.SENDER_EMAIL && !env.SENDER_EMAIL.endsWith('@gmail.com') && !env.SENDER_EMAIL.endsWith('@yahoo.com') && !env.SENDER_EMAIL.endsWith('@hotmail.com')) {
        fromEmail = `BioArchive <${env.SENDER_EMAIL}>`;
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
        console.log('[notify] Sent email via Resend successfully.');
        return { success: true };
      }
      const errText = await res.text();
      errors.push(`Resend error (${res.status}): ${errText}`);
    } catch (err) {
      errors.push(`Resend exception: ${err.message}`);
    }
  }

  return { success: false, error: errors.join(' | ') };
}

async function testUploadNotification() {
  const modEmails = env.MOD_EMAILS || env.ADMIN_EMAILS || 'bioarchive007@gmail.com';
  const recipients = modEmails.split(',').map(e => e.trim()).filter(Boolean);

  const result = await sendEmailHelper({
    to: recipients,
    subject: '[BioArchive] New Upload Test Notification',
    html: `
      <h2>New Materials Uploaded to BioArchive</h2>
      <p>A new upload notification has been sent.</p>
      <ul>
        <li>Course: BIO101 - Cell Biology</li>
        <li>Uploader: Admin Test</li>
        <li>File: BIO101_Lecture_Notes_2026.pdf</li>
      </ul>
    `
  });

  console.log('Notification result:', result);
}

testUploadNotification();
