'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { siteConfig } = useAuth();

  if (siteConfig?.enableContactForm === false) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 24px',
        background: 'var(--bg)',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{
          maxWidth: '440px',
          padding: '40px 32px',
          background: 'var(--panel)',
          border: '1px solid var(--glass-border)',
          borderRadius: '20px',
          boxShadow: 'var(--glass-shadow-hover)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <AlertCircle size={48} style={{ color: 'var(--gold)', marginBottom: '20px' }} />
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.3rem', color: '#f0f0f0', marginBottom: '12px' }}>
            Contact Form Offline
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-3)', lineHeight: '1.6', marginBottom: '24px' }}>
            The moderator contact form is currently disabled by the site administrator. Please check back later.
          </p>
          <Link href="/" className="btn-gold" style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
            Return to Home
          </Link>
        </div>
      </div>
    );
  }
  const [subject, setSubject] = useState('Feedback');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });

      if (res.ok) {
        setSuccess(true);
        setName('');
        setEmail('');
        setMessage('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="contact-wrapper">
        {/* Sticky Header */}
        <div className="contact-header">
          <div className="contact-header-inner">
            <Link href="/" className="contact-back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </Link>
            <div className="contact-header-info">
              <Link href="/" className="navbar-wordmark">
                <span className="wordmark-bio">Bio</span>
                <span className="wordmark-archive">Archive</span>
              </Link>
              <h1 className="contact-title">Contact Us</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="contact-content">
          <div className="contact-card">
            <div className="contact-card-header">
              <Mail size={18} className="contact-icon" />
              <h3>Send Feedback & Inquiries</h3>
            </div>
            <p className="contact-desc">
              Have a suggestion, a feature idea, or noticed incorrect file metadata? Send a direct message to the moderators here.
            </p>

            {error && (
              <div className="form-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success ? (
              <motion.div
                className="form-success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <CheckCircle2 size={36} className="success-icon" />
                <h4>Message Sent!</h4>
                <p>Thank you for reaching out. The moderators will review your feedback shortly.</p>
                <button className="btn-ghost" onClick={() => setSuccess(false)}>
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleContactSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="c-name">Your Name</label>
                  <input
                    id="c-name"
                    type="text"
                    className="contact-input"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="c-email">Your Email</label>
                  <input
                    id="c-email"
                    type="email"
                    className="contact-input"
                    placeholder="yourname@niser.ac.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="c-subject">Subject</label>
                  <select
                    id="c-subject"
                    className="contact-select"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  >
                    <option value="Feedback">General Feedback</option>
                    <option value="Issue Report">Report an Issue / Bug</option>
                    <option value="Material Request">Request New Course Registry</option>
                    <option value="Other">Other Query</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="c-message">Message</label>
                  <textarea
                    id="c-message"
                    className="contact-textarea"
                    placeholder="Type your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-gold contact-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                  {!submitting && <Send size={14} style={{ marginLeft: 6 }} />}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .contact-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .contact-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3, 10, 24, 0.45);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border-bottom: 1px solid var(--glass-border);
        }
        .contact-header-inner {
          max-width: 600px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .contact-back {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.82rem;
          color: var(--text-2);
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .contact-back:hover { background: var(--glass-hover); color: var(--text); }
        .contact-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .contact-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          line-height: 1.1;
        }
        @media (max-width: 600px) {
          .contact-header-inner { padding: 12px 14px; gap: 8px; }
          .contact-back span { display: none; }
          .contact-title { font-size: 1rem; }
        }
        .contact-content {
          flex: 1;
          max-width: 600px;
          margin: 0 auto;
          width: 100%;
          padding: 24px 24px 40px;
        }
        @media (max-width: 600px) {
          .contact-content { padding: 16px 12px 32px; }
        }
        .contact-card {
          background: var(--panel);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 24px;
          transition: transform 0.4s var(--ease-out), border-color 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
          box-shadow: var(--glass-shadow);
        }
        .contact-card:hover {
          transform: translateY(-4px);
          border-color: var(--glass-border-hover);
          box-shadow: var(--glass-shadow-hover);
        }
        .contact-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }
        .contact-icon {
          color: var(--gold);
        }
        .contact-card h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 0.98rem;
          font-weight: 600;
          color: #f0f0f0;
          margin: 0;
        }
        .contact-desc {
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem;
          color: var(--text-3);
          line-height: 1.5;
          margin-bottom: 18px;
        }
        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .form-group label {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .contact-input, .contact-select, .contact-textarea {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 8px 12px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem;
          color: var(--text);
          outline: none;
          transition: border-color 0.2s;
        }
        .contact-input:focus, .contact-select:focus, .contact-textarea:focus {
          border-color: rgba(2, 132, 199, 0.4);
        }
        .contact-textarea {
          resize: vertical;
        }
        .contact-submit-btn {
          margin-top: 6px;
          justify-content: center;
        }
        .form-error {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
          color: #f87171;
          font-family: 'Outfit', sans-serif;
          font-size: 0.78rem;
          margin-bottom: 12px;
        }
        .form-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
          padding: 30px 10px;
          color: var(--text-2);
          font-family: 'Outfit', sans-serif;
        }
        .success-icon {
          color: var(--green-light);
        }
        .form-success h4 {
          font-size: 1.1rem;
          color: #fff;
          margin: 0;
        }
        .form-success p {
          font-size: 0.84rem;
          margin: 0 0 10px;
          line-height: 1.5;
        }
      `}</style>
    </>
  );
}
