'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Download, Clock, AlertCircle, Loader2, Library, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { BookRequest } from '@/types';

export default function MyBooksPage() {
  const { user, idToken, triggerLogin } = useAuth();
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isNiserAccount = !!user && (user.email.toLowerCase().endsWith('@niser.ac.in') || (isDev && user.email.toLowerCase().endsWith('@gmail.com')));

  useEffect(() => {
    if (!idToken || !isNiserAccount) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    fetch(`/api/books/my-requests?token=${encodeURIComponent(idToken)}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load your library.');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          // Filter out expired allowed books (after 3 days)
          const now = new Date();
          const activeRequests = data.filter((req) => {
            if (req.status === 'Allowed') {
              if (!req.expiresAt) return true;
              return new Date(req.expiresAt) > now;
            }
            // Keep Pending and Denied in history, or filter if expired
            return req.status !== 'Expired';
          });
          setRequests(activeRequests);
        } else {
          setRequests([]);
        }
      })
      .catch((err) => {
        setError(err.message || 'Something went wrong while fetching requests.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [idToken, isNiserAccount]);

  // Format date helper
  const formatExpiry = (expiresAtStr: string) => {
    if (!expiresAtStr) return '';
    const date = new Date(expiresAtStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }) + ' IST';
  };

  const getRemainingTime = (expiresAtStr: string) => {
    if (!expiresAtStr) return '';
    const diffMs = new Date(expiresAtStr).getTime() - Date.now();
    if (diffMs <= 0) return 'Expired';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours >= 24) {
      const days = Math.floor(diffHours / 24);
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
  };

  // ── Not signed in ─────────────────────────────────────────
  if (!user) {
    return (
      <div className="mb-bg">
        <motion.div className="mb-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-header">
            <Link href="/" className="mb-back"><ArrowLeft size={16} strokeWidth={1.5} /><span>Back</span></Link>
            <div className="mb-logo-area"><Library size={20} strokeWidth={1.3} className="mb-logo-icon" /><span className="mb-logo-text">My Library</span></div>
          </div>
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div className="mb-lock-icon">🔒</div>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.25rem', color: 'var(--text, #e8e8e8)', margin: '0 0 12px' }}>Sign in to View Your Library</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.88rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 24px' }}>
              Your digital library containing approved reference books requires authentication.
            </p>
            <button className="mb-btn-primary" onClick={() => triggerLogin()} style={{ width: '100%' }}>
              Sign in with NISER Google Account
            </button>
          </div>
        </motion.div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // ── Non-NISER account ─────────────────────────────────────
  if (!isNiserAccount) {
    return (
      <div className="mb-bg">
        <motion.div className="mb-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-header">
            <Link href="/" className="mb-back"><ArrowLeft size={16} strokeWidth={1.5} /><span>Back</span></Link>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15rem', color: '#f87171', margin: '0 0 10px' }}>NISER Account Required</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 8px' }}>
              Only <code style={{ color: 'var(--gold)' }}>@niser.ac.in</code> accounts have access to the book library.
            </p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>Signed in as: {user.email}</p>
          </div>
        </motion.div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="mb-bg">
      <div className="mb-container">
        {/* Header */}
        <div className="mb-page-header">
          <Link href="/" className="mb-back"><ArrowLeft size={16} strokeWidth={1.5} /><span>Back</span></Link>
          <div className="mb-title-wrap">
            <Library size={24} className="mb-title-icon" />
            <h1 className="mb-title">My Book Library</h1>
          </div>
          <p className="mb-subtitle">Track requests and download approved books. Approved books are available for 3 days.</p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mb-loading-state">
            <Loader2 size={32} className="mb-spin" />
            <p>Loading library bookshelf...</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="mb-error-state">
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        )}

        {/* Shelf Content */}
        {!loading && !error && (
          <>
            {requests.length === 0 ? (
              <motion.div className="mb-empty-shelf" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <BookOpen size={48} strokeWidth={1} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <h3>Your bookshelf is empty</h3>
                <p>You haven't requested any books yet, or your approved books have expired.</p>
                <Link href="/request-book" className="mb-btn-primary" style={{ marginTop: '16px', display: 'inline-flex' }}>
                  Request a Book Now
                </Link>
              </motion.div>
            ) : (
              <div className="mb-grid">
                <AnimatePresence mode="popLayout">
                  {requests.map((req) => {
                    const isAllowed = req.status === 'Allowed';
                    const isPending = req.status === 'Pending';
                    const isDenied = req.status === 'Denied';

                    return (
                      <motion.div
                        key={req.requestId}
                        className="mb-book-card"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="mb-book-info">
                          <span className="mb-course-badge">{req.courseCode}</span>
                          <h3 className="mb-book-title">{req.bookName}</h3>
                          {req.author && <p className="mb-book-author">by {req.author}</p>}
                          {req.edition && <p className="mb-book-edition">{req.edition}</p>}
                          <p className="mb-course-name">{req.courseName} · Sem {req.semester}</p>
                        </div>

                        <div className="mb-card-footer">
                          {isAllowed && (
                            <div className="mb-status-section">
                              <div className="mb-badge-success">
                                <CheckCircle2 size={12} /> Approved
                              </div>
                              <div className="mb-expiry-info">
                                <Clock size={12} />
                                <span>{getRemainingTime(req.expiresAt)}</span>
                              </div>
                            </div>
                          )}

                          {isPending && (
                            <div className="mb-status-section">
                              <div className="mb-badge-pending">
                                <Loader2 size={12} className="mb-spin" /> Under Review
                              </div>
                              <span className="mb-time-hint">Requested on {new Date(req.timestamp).toLocaleDateString('en-IN')}</span>
                            </div>
                          )}

                          {isDenied && (
                            <div className="mb-status-section">
                              <div className="mb-badge-denied">
                                <XCircle size={12} /> Declined
                              </div>
                              <span className="mb-time-hint">Unavailable</span>
                            </div>
                          )}

                          {isAllowed && req.driveViewLink && (
                            <a
                              href={req.driveViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="mb-download-btn"
                            >
                              <Download size={14} />
                              <span>Download PDF</span>
                            </a>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Cinzel:wght@700&display=swap');

  .mb-bg {
    min-height: 100vh;
    background: var(--bg, #030a18);
    color: var(--text, #e8e8e8);
    padding: 40px 24px;
    display: flex;
    justify-content: center;
  }
  .mb-container {
    width: 100%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .mb-page-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .mb-back {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.78rem;
    color: rgba(255,255,255,0.4);
    padding: 5px 10px;
    border-radius: 8px;
    transition: background 0.15s, color 0.15s;
    text-decoration: none;
    align-self: flex-start;
  }
  .mb-back:hover {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.75);
  }
  .mb-title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 8px;
  }
  .mb-title-icon {
    color: var(--gold, #d4a853);
  }
  .mb-title {
    font-family: 'Cinzel', serif;
    font-size: 1.7rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: 0.02em;
  }
  .mb-subtitle {
    font-family: 'Outfit', sans-serif;
    font-size: 0.88rem;
    color: rgba(255,255,255,0.5);
    margin: 0;
    max-width: 600px;
    line-height: 1.5;
  }

  /* Cards Grid */
  .mb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }
  .mb-book-card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 16px;
    padding: 20px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 200px;
    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
  }
  .mb-book-card:hover {
    transform: translateY(-2px);
    border-color: rgba(212,168,83,0.25);
    box-shadow: 0 8px 30px rgba(0,0,0,0.3);
  }
  .mb-book-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }
  .mb-course-badge {
    align-self: flex-start;
    background: rgba(212,168,83,0.1);
    border: 1px solid rgba(212,168,83,0.2);
    color: var(--gold, #d4a853);
    font-family: 'Outfit', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 6px;
    text-transform: uppercase;
  }
  .mb-book-title {
    font-family: 'Outfit', sans-serif;
    font-size: 1.05rem;
    font-weight: 600;
    margin: 4px 0 0;
    line-height: 1.4;
  }
  .mb-book-author {
    font-family: 'Outfit', sans-serif;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
    margin: 0;
  }
  .mb-book-edition {
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    color: rgba(255,255,255,0.4);
    margin: -4px 0 0;
  }
  .mb-course-name {
    font-family: 'Outfit', sans-serif;
    font-size: 0.76rem;
    color: rgba(255,255,255,0.35);
    margin: 4px 0 0;
  }

  /* Card Footer & Badges */
  .mb-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid rgba(255,255,255,0.05);
    padding-top: 14px;
    gap: 12px;
  }
  .mb-status-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .mb-badge-success {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #10b981;
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .mb-badge-pending {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #f59e0b;
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .mb-badge-denied {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #ef4444;
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
  }
  .mb-expiry-info {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.7rem;
    color: rgba(255,255,255,0.4);
  }
  .mb-time-hint {
    font-family: 'Outfit', sans-serif;
    font-size: 0.68rem;
    color: rgba(255,255,255,0.3);
  }
  .mb-download-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(135deg, rgba(212,168,83,0.95), rgba(180,130,50,0.95));
    color: #0d1b35;
    border: none;
    border-radius: 8px;
    padding: 8px 12px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.2s;
  }
  .mb-download-btn:hover {
    background: linear-gradient(135deg, #d4a853, #b48232);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(212,168,83,0.25);
  }

  /* Empty Shelf */
  .mb-empty-shelf {
    background: rgba(255,255,255,0.015);
    border: 1px dashed rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 60px 40px;
    text-align: center;
    font-family: 'Outfit', sans-serif;
  }
  .mb-empty-shelf h3 {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 8px;
  }
  .mb-empty-shelf p {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.4);
    margin: 0;
  }

  /* Auth / Lock Card */
  .mb-card {
    width: 100%;
    max-width: 460px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 24px;
    padding: 36px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 8px 60px rgba(0,0,0,0.5);
    align-self: center;
  }
  .mb-lock-icon {
    font-size: 2.2rem;
    margin-bottom: 16px;
  }
  .mb-logo-area {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }
  .mb-logo-icon {
    color: var(--gold, #d4a853);
  }
  .mb-logo-text {
    font-family: 'Cinzel', serif;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text, #e8e8e8);
    letter-spacing: 0.03em;
  }
  .mb-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .mb-btn-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, rgba(212,168,83,0.9), rgba(180,130,50,0.9));
    color: #0d1b35;
    border: none;
    border-radius: 10px;
    padding: 12px 20px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }
  .mb-btn-primary:hover {
    background: linear-gradient(135deg, #d4a853, #b48232);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(212,168,83,0.25);
  }
  .mb-btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.6);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 12px 20px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
  }
  .mb-btn-secondary:hover {
    background: rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.85);
  }

  /* Loading State */
  .mb-loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 80px 0;
    color: rgba(255,255,255,0.4);
    font-family: 'Outfit', sans-serif;
    font-size: 0.88rem;
  }
  .mb-error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 0;
    color: #f87171;
    font-family: 'Outfit', sans-serif;
    font-size: 0.88rem;
  }

  .mb-spin { animation: mbSpin 0.7s linear infinite; }
  @keyframes mbSpin { to { transform: rotate(360deg); } }
`;
