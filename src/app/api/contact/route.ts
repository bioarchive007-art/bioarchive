export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getSiteConfig } from '@/lib/sheets';
import { rateLimit } from '@/lib/rate-limit';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { serverError } from '@/lib/errors';

/** Escapes special HTML characters to prevent XSS in email bodies. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * POST /api/contact
 *
 * Sends a message from the contact form to the moderators via Resend API.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate-limit: 3 contact form submissions per IP per 10 minutes
    const rl = await rateLimit(request, 'contact', 3, 600);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const siteConfig = await getSiteConfig().catch(() => ({ enableContactForm: true }));
    if (siteConfig.enableContactForm === false) {
      return NextResponse.json({ error: 'Contact form is currently disabled by the administrator.' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, subject, message, cfTurnstileToken } = body;

    // Verify Turnstile challenge (skipped gracefully if TURNSTILE_SECRET_KEY not yet set)
    const turnstileOk = await verifyTurnstileToken(cfTurnstileToken);
    if (!turnstileOk) {
      return NextResponse.json(
        { error: 'Human verification failed. Please complete the challenge and try again.' },
        { status: 403 }
      );
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields (name, email, subject, message) are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    const modEmails = process.env.MOD_EMAILS;

    if (!apiKey || !modEmails) {
      console.warn('[api/contact] RESEND_API_KEY or MOD_EMAILS not configured.');
      // Return success to user so they don't see system setup errors, or return 500. Let's return 500.
      return NextResponse.json(
        { error: 'Contact system is not fully configured. Please try again later.' },
        { status: 503 }
      );
    }

    const recipients = modEmails.split(',').map(e => e.trim()).filter(Boolean);
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'No moderator email recipients found' },
        { status: 500 }
      );
    }

    // Escape all user inputs before embedding in HTML to prevent XSS
    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = escapeHtml(message);

    // Call Resend API to send message
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.SENDER_EMAIL || 'BioArchive Contact Form <onboarding@resend.dev>',
        to: recipients,
        reply_to: `${safeName} <${safeEmail}>`,
        subject: `[BioArchive Contact] ${safeSubject}`,
        html: `
          <h2>New Contact Form Message</h2>
          <p><strong>From:</strong> ${safeName} (&lt;${safeEmail}&gt;)</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <hr style="border:0;border-top:1px solid #ccc;margin:20px 0;" />
          <p style="white-space:pre-wrap;line-height:1.6;font-family:sans-serif;">${safeMessage}</p>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend API error: ${res.statusText} - ${err}`);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[api/contact] Error:', err);
    return NextResponse.json(
      { error: serverError(err, 'Failed to send contact message. Please try again.') },
      { status: 500 }
    );
  }
}
