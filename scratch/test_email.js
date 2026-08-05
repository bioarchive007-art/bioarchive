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

async function testResendOnboarding() {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BioArchive <onboarding@resend.dev>',
        to: [env.MOD_EMAILS || 'bioarchive007@gmail.com'],
        subject: '[BioArchive] Test Upload Email (Resend onboarding@resend.dev)',
        html: '<h1>Test Email from Resend</h1><p>If you receive this email, Resend works when using onboarding@resend.dev!</p>',
      }),
    });
    console.log('Resend response status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Resend response body:', text);
  } catch (e) {
    console.error('Resend fetch error:', e);
  }
}

testResendOnboarding();
