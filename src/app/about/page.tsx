'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Mail, Info, FileCheck, ShieldAlert } from 'lucide-react';

export default function AboutPage() {
  // Contact Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
      <div className="about-wrapper">
        {/* Sticky Header */}
        <div className="about-header">
          <div className="about-header-inner">
            <a href="/" className="about-back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </a>
            <div className="about-header-info">
              <a href="/" className="navbar-wordmark">
                <span className="wordmark-bio">BIO</span>
                <span className="wordmark-archive">Archive</span>
              </a>
              <h1 className="about-title">About & Contact</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="about-content">
          <div className="about-grid">
            {/* Info Column */}
            <div className="info-column">
              {/* Card 1: What is BioArchive */}
              <section className="info-card">
                <div className="info-card-header">
                  <Info size={18} className="info-icon" />
                  <h3>What is BioArchive?</h3>
                </div>
                <p>
                  BioArchive is a community-driven repository designed specifically for students at the <strong>School of Biological Sciences, NISER</strong>. It serves as a central hub to access, share, and preserve past academic materials including lecture notes, course slides, past year question papers, and laboratory guides.
                </p>
                <p>
                  Our goal is to make academic resources easily accessible to help students study efficiently and succeed in their respective curriculum.
                </p>
              </section>

              {/* Card 2: Guidelines */}
              <section className="info-card">
                <div className="info-card-header">
                  <FileCheck size={18} className="info-icon check" />
                  <h3>Upload Guidelines</h3>
                </div>
                <p>To keep the archive clean and reliable, please adhere to these rules when sharing files:</p>
                <ul className="guidelines-list">
                  <li><strong>Standard Formats:</strong> Upload documents as PDFs, Slides as PPTX or PPT, Images as JPG, JPEG or PNG and combined packages as ZIP archives.</li>
                  <li><strong>Correct Metadata:</strong> Make sure to select the correct course, semester, year, and professor co-teaching the module.</li>
                  <li><strong>Legibility:</strong> If scanning physically written papers or laboratory notebooks, ensure the image is bright and easily readable.</li>
                  <li><strong>No Spam:</strong> Avoid uploading duplicate files. Our system checks hashes and metadata duplicates to keep the sheet registry lean.</li>
                </ul>
              </section>

              {/* Card 3: Notice & Disclaimer */}
              <section className="info-card disclaimer">
                <div className="info-card-header">
                  <ShieldAlert size={18} className="info-icon alert" />
                  <h3>Academic Integrity</h3>
                </div>
                <p>
                  All files shared on BioArchive are uploaded voluntarily by students for reference purposes only. BioArchive does not promote plagiarism, academic dishonesty, or policy violations. Instructors and maintainers reserve the right to request deletion of materials at any time.
                </p>
              </section>
            </div>

            {/* Contact Form Column */}
            <div className="contact-column">
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
                        className="about-input"
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
                        className="about-input"
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
                        className="about-select"
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
                        className="about-textarea"
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
        </div>
      </div>

      <style jsx>{`
        .about-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .about-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3, 10, 24, 0.88);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--glass-border);
        }
        .about-header-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .about-back {
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
        .about-back:hover { background: var(--glass-hover); color: var(--text); }
        .about-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .about-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          line-height: 1.1;
        }
        @media (max-width: 600px) {
          .about-header-inner { padding: 12px 14px; gap: 8px; }
          .about-back span { display: none; }
          .about-title { font-size: 1rem; }
        }
        .about-content {
          flex: 1;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          padding: 24px 24px 40px;
        }
        @media (max-width: 600px) {
          .about-content { padding: 16px 12px 32px; }
        }
        .about-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 32px;
          align-items: start;
        }
        @media (max-width: 860px) {
          .about-grid { grid-template-columns: 1fr; gap: 28px; }
        }
        .info-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .info-card {
          background: var(--panel);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 24px;
          transition: transform 0.4s var(--ease-out), border-color 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .info-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 229, 255, 0.25);
          box-shadow: 0 16px 32px rgba(0, 229, 255, 0.06), 0 8px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .info-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }
        .info-icon {
          color: var(--green-light);
        }
        .info-icon.check { color: #3b82f6; }
        .info-icon.alert { color: #ef4444; }
        .info-card h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 0.98rem;
          font-weight: 600;
          color: #f0f0f0;
          margin: 0;
        }
        .info-card p {
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          color: var(--text-2);
          line-height: 1.6;
          margin-bottom: 12px;
        }
        .info-card p:last-of-type { margin-bottom: 0; }
        .guidelines-list {
          padding-left: 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.82rem;
          color: var(--text-2);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .disclaimer {
          background: rgba(239, 68, 68, 0.02);
          border-color: rgba(239, 68, 68, 0.1);
        }
        /* --- Contact Form --- */
        .contact-column {
          display: flex;
          flex-direction: column;
        }
        .contact-card {
          background: var(--panel);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 24px;
          transition: transform 0.4s var(--ease-out), border-color 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .contact-card:hover {
          transform: translateY(-4px);
          border-color: rgba(0, 229, 255, 0.25);
          box-shadow: 0 16px 32px rgba(0, 229, 255, 0.06), 0 8px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
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
        .about-input, .about-select, .about-textarea {
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
        .about-input:focus, .about-select:focus, .about-textarea:focus {
          border-color: rgba(2, 132, 199, 0.4);
        }
        .about-textarea {
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
