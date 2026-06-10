export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/contact
 *
 * Sends a message from the contact form to the moderators via Resend API.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

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
        reply_to: `${name} <${email}>`,
        subject: `[BioArchive Contact] ${subject}`,
        html: `
          <h2>New Contact Form Message</h2>
          <p><strong>From:</strong> ${name} (&lt;${email}&gt;)</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr style="border:0;border-top:1px solid #ccc;margin:20px 0;" />
          <p style="white-space:pre-wrap;line-height:1.6;font-family:sans-serif;">${message}</p>
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
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
