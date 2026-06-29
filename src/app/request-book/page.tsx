'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Send, ChevronRight, CheckCircle, AlertCircle, Loader2, GraduationCap, User } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { CONFIG } from '@/config';
import { useAuth } from '@/components/AuthProvider';

const ALL_SEMESTERS = [...CONFIG.NISER_SEMESTERS.map(String), 'ADVANCE COURSES'];
type BookItem = { id: string; name: string; webViewLink?: string };

export default function RequestBookPage() {
  const { user, idToken, triggerLogin } = useAuth();

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Book form fields
  const [semester, setSemester] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [selectedBookId, setSelectedBookId] = useState('');
  const [isNewBook, setIsNewBook] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookAuthor, setNewBookAuthor] = useState('');
  const [newBookEdition, setNewBookEdition] = useState('');
  const [books, setBooks] = useState<BookItem[]>([]);
  const [booksLoading, setBooksLoading] = useState(false);

  const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const isNiserAccount = !!user && (user.email.toLowerCase().endsWith('@niser.ac.in') || (isDev && user.email.toLowerCase().endsWith('@gmail.com')));

  const coursesForSem = semester ? CURRICULUM[semester] || [] : [];
  const selectedCourse = useMemo(() => coursesForSem.find(c => c.code === courseCode) || null, [coursesForSem, courseCode]);
  const selectedBook = useMemo(() => books.find(b => b.id === selectedBookId) || null, [books, selectedBookId]);

  useEffect(() => {
    if (!semester || !courseCode) { setBooks([]); setSelectedBookId(''); return; }
    setBooksLoading(true);
    setBooks([]);
    setSelectedBookId('');
    setIsNewBook(false);
    fetch(`/api/books?semester=${encodeURIComponent(semester)}&courseCode=${encodeURIComponent(courseCode)}`)
      .then(r => r.json())
      .then(data => setBooks(Array.isArray(data) ? data : []))
      .catch(() => setBooks([]))
      .finally(() => setBooksLoading(false));
  }, [semester, courseCode]);

  const handleSubmit = async () => {
    setError('');
    const bookName = isNewBook ? newBookTitle.trim() : (selectedBook?.name || '');
    if (!semester || !courseCode || !bookName) { setError('Please fill all required fields.'); return; }
    if (isNewBook && !newBookAuthor.trim()) { setError('Author name is required for new book requests.'); return; }
    if (!idToken) { triggerLogin(); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/books/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: idToken,
          semester,
          courseCode,
          courseName: selectedCourse?.name || courseCode,
          bookName,
          driveFileId: isNewBook ? '' : selectedBookId,
          isNewBook,
          author: isNewBook ? newBookAuthor.trim() : '',
          edition: isNewBook ? newBookEdition.trim() : '',
        }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) { setError(data.error || 'Something went wrong. Please try again.'); return; }
      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="rb-bg">
        <motion.div className="rb-card" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45 }}>
          <div className="rb-success-icon"><CheckCircle size={52} strokeWidth={1.2} /></div>
          <h2 className="rb-success-title">Request Submitted!</h2>
          <p className="rb-success-desc">Your request has been sent to the admin. Once approved, the book will appear in your library and you will receive an email.</p>
          <p className="rb-success-email">{user?.email}</p>
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <Link href="/my-books" className="rb-btn-primary" style={{ flex: 1 }}>View My Books</Link>
            <Link href="/" className="rb-btn-secondary" style={{ flex: 1 }}>Back to Home</Link>
          </div>
        </motion.div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // ── Not signed in ─────────────────────────────────────────
  if (!user) {
    return (
      <div className="rb-bg">
        <motion.div className="rb-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="rb-header">
            <Link href="/" className="rb-back"><ArrowLeft size={16} strokeWidth={1.5} /><span>Back</span></Link>
            <div className="rb-logo-area"><BookOpen size={20} strokeWidth={1.3} className="rb-logo-icon" /><span className="rb-logo-text">Request a Book</span></div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(212,168,83,0.1)', border: '1px solid rgba(212,168,83,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <User size={24} strokeWidth={1.3} style={{ color: 'var(--gold)' }} />
            </div>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: 'var(--text, #e8e8e8)', margin: '0 0 10px' }}>Sign in to Request a Book</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 24px' }}>You need to sign in with your NISER Google account to request reference books.</p>
            <button className="rb-btn-primary" onClick={() => triggerLogin()} style={{ width: '100%' }}>
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
      <div className="rb-bg">
        <motion.div className="rb-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rb-header">
            <Link href="/" className="rb-back"><ArrowLeft size={16} strokeWidth={1.5} /><span>Back</span></Link>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.1rem', color: '#f87171', margin: '0 0 10px' }}>NISER Account Required</h2>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: '0 0 8px' }}>Only <code style={{ color: 'var(--gold)' }}>@niser.ac.in</code> institutional accounts can request reference books.</p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', margin: '0 0 20px' }}>Currently signed in as: {user.email}</p>
          </div>
        </motion.div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────
  return (
    <div className="rb-bg">
      <motion.div className="rb-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        <div className="rb-header">
          <Link href="/" className="rb-back"><ArrowLeft size={16} strokeWidth={1.5} /><span>Back</span></Link>
          <div className="rb-logo-area"><BookOpen size={20} strokeWidth={1.3} className="rb-logo-icon" /><span className="rb-logo-text">Request a Book</span></div>
        </div>

        {/* Signed-in user badge */}
        <div className="rb-user-badge">
          <div className="rb-user-avatar">{user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}</div>
          <div>
            <div className="rb-user-name">{user.name}</div>
            <div className="rb-user-email">{user.email}</div>
          </div>
        </div>

        <motion.div className="rb-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <p className="rb-form-title">Which reference book do you need?</p>

          {/* Semester Dropdown */}
          <div className="rb-field">
            <label className="rb-label"><GraduationCap size={13} /> Semester</label>
            <select id="rb-semester" className="rb-select" value={semester} onChange={e => { setSemester(e.target.value); setCourseCode(''); }}>
              <option value="">Select Semester</option>
              {ALL_SEMESTERS.map(s => (
                <option key={s} value={s}>{s === 'ADVANCE COURSES' ? 'Advance Courses' : `Semester ${s}`}</option>
              ))}
            </select>
          </div>

          {/* Course Dropdown */}
          {semester && (
            <motion.div className="rb-field" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <label className="rb-label">Course</label>
              <select id="rb-course" className="rb-select" value={courseCode} onChange={e => setCourseCode(e.target.value)}>
                <option value="">Select Course</option>
                {coursesForSem.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
            </motion.div>
          )}

          {/* Book Dropdown */}
          {courseCode && (
            <motion.div className="rb-field" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <label className="rb-label">
                <BookOpen size={13} /> Book
                {booksLoading && <Loader2 size={12} className="rb-spin" />}
              </label>
              <select id="rb-book" className="rb-select" value={isNewBook ? '__new__' : selectedBookId}
                onChange={e => {
                  if (e.target.value === '__new__') { setIsNewBook(true); setSelectedBookId(''); }
                  else { setIsNewBook(false); setSelectedBookId(e.target.value); }
                }}
                disabled={booksLoading}
              >
                <option value="">{booksLoading ? 'Loading books...' : 'Select a book'}</option>
                {books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                <option value="__new__">📦 Book not listed — Add it here</option>
              </select>
            </motion.div>
          )}

          {/* New Book Fields */}
          <AnimatePresence>
            {isNewBook && (
              <motion.div className="rb-new-book-section" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                <div className="rb-new-book-label">New Book Details</div>
                <div className="rb-field">
                  <label className="rb-label">Book Title *</label>
                  <input id="rb-new-title" className="rb-input" type="text" placeholder="e.g. Lehninger Principles of Biochemistry" value={newBookTitle} onChange={e => setNewBookTitle(e.target.value)} />
                </div>
                <div className="rb-field">
                  <label className="rb-label">Author(s) *</label>
                  <input id="rb-new-author" className="rb-input" type="text" placeholder="e.g. David L. Nelson, Michael M. Cox" value={newBookAuthor} onChange={e => setNewBookAuthor(e.target.value)} />
                </div>
                <div className="rb-field">
                  <label className="rb-label">Edition (optional)</label>
                  <input id="rb-new-edition" className="rb-input" type="text" placeholder="e.g. 7th Edition" value={newBookEdition} onChange={e => setNewBookEdition(e.target.value)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="rb-error"><AlertCircle size={14} /> {error}</div>
          )}

          <button
            className="rb-btn-primary"
            onClick={handleSubmit}
            disabled={loading || !semester || !courseCode || (!isNewBook && !selectedBookId) || (isNewBook && !newBookTitle.trim())}
          >
            {loading ? <><Loader2 size={15} className="rb-spin" /> Submitting...</> : <><Send size={15} /> Submit Request</>}
          </button>
        </motion.div>
      </motion.div>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Cinzel:wght@700&display=swap');
  .rb-bg { min-height:100vh; background:var(--bg,#030a18); display:flex; align-items:center; justify-content:center; padding:24px 16px; }
  .rb-card { width:100%; max-width:500px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.09); border-radius:24px; padding:36px 36px 32px; backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); box-shadow:0 8px 60px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.04) inset; }
  @media(max-width:540px){ .rb-card{padding:24px 20px 20px;border-radius:18px;} }
  .rb-header { display:flex; align-items:center; gap:12px; margin-bottom:20px; }
  .rb-back { display:flex; align-items:center; gap:5px; font-family:'Outfit',sans-serif; font-size:0.78rem; color:rgba(255,255,255,0.4); padding:5px 10px; border-radius:8px; transition:background 0.15s,color 0.15s; text-decoration:none; }
  .rb-back:hover { background:rgba(255,255,255,0.06); color:rgba(255,255,255,0.75); }
  .rb-logo-area { display:flex; align-items:center; gap:8px; margin-left:auto; }
  .rb-logo-icon { color:var(--gold,#d4a853); }
  .rb-logo-text { font-family:'Cinzel',serif; font-size:0.9rem; font-weight:700; color:var(--text,#e8e8e8); letter-spacing:0.03em; }
  .rb-user-badge { display:flex; align-items:center; gap:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 14px; margin-bottom:22px; }
  .rb-user-avatar { width:36px; height:36px; border-radius:50%; background:rgba(212,168,83,0.12); border:1px solid rgba(212,168,83,0.25); display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-size:0.76rem; font-weight:700; color:var(--gold,#d4a853); flex-shrink:0; }
  .rb-user-name { font-family:'Outfit',sans-serif; font-size:0.85rem; font-weight:600; color:var(--text,#e8e8e8); }
  .rb-user-email { font-family:'Outfit',sans-serif; font-size:0.72rem; color:rgba(255,255,255,0.4); }
  .rb-form { display:flex; flex-direction:column; gap:16px; }
  .rb-form-title { font-family:'Outfit',sans-serif; font-size:0.95rem; font-weight:600; color:var(--text,#e8e8e8); margin:0 0 2px; }
  .rb-field { display:flex; flex-direction:column; gap:6px; }
  .rb-label { display:flex; align-items:center; gap:5px; font-family:'Outfit',sans-serif; font-size:0.73rem; font-weight:600; color:rgba(255,255,255,0.5); letter-spacing:0.04em; text-transform:uppercase; }
  .rb-input,.rb-select { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:11px 14px; color:var(--text,#e8e8e8); font-family:'Outfit',sans-serif; font-size:0.88rem; outline:none; transition:border-color 0.2s,background 0.2s,box-shadow 0.2s; width:100%; box-sizing:border-box; -webkit-appearance:none; appearance:none; }
  .rb-select { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; padding-right:36px; cursor:pointer; }
  .rb-select option { background:#0d1b35; color:#e8e8e8; }
  .rb-input:focus,.rb-select:focus { border-color:rgba(212,168,83,0.5); background:rgba(255,255,255,0.06); box-shadow:0 0 0 3px rgba(212,168,83,0.08); }
  .rb-input::placeholder { color:rgba(255,255,255,0.25); }
  .rb-new-book-section { overflow:hidden; background:rgba(212,168,83,0.05); border:1px solid rgba(212,168,83,0.15); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:14px; }
  .rb-new-book-label { font-family:'Outfit',sans-serif; font-size:0.72rem; font-weight:700; color:var(--gold,#d4a853); text-transform:uppercase; letter-spacing:0.06em; }
  .rb-error { display:flex; align-items:center; gap:7px; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:8px; padding:10px 14px; font-family:'Outfit',sans-serif; font-size:0.82rem; color:#f87171; }
  .rb-btn-primary { display:flex; align-items:center; justify-content:center; gap:7px; background:linear-gradient(135deg,rgba(212,168,83,0.9),rgba(180,130,50,0.9)); color:#0d1b35; border:none; border-radius:10px; padding:12px 20px; font-family:'Outfit',sans-serif; font-size:0.88rem; font-weight:700; cursor:pointer; transition:all 0.2s; text-decoration:none; }
  .rb-btn-primary:hover:not(:disabled) { background:linear-gradient(135deg,#d4a853,#b48232); transform:translateY(-1px); box-shadow:0 4px 16px rgba(212,168,83,0.25); }
  .rb-btn-primary:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
  .rb-btn-secondary { display:flex; align-items:center; justify-content:center; gap:7px; background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:12px 20px; font-family:'Outfit',sans-serif; font-size:0.88rem; font-weight:600; cursor:pointer; transition:all 0.2s; text-decoration:none; }
  .rb-btn-secondary:hover { background:rgba(255,255,255,0.09); color:rgba(255,255,255,0.85); }
  .rb-spin { animation:rbSpin 0.7s linear infinite; }
  @keyframes rbSpin { to{transform:rotate(360deg);} }
  .rb-success-icon { display:flex; justify-content:center; color:#10b981; margin-bottom:16px; }
  .rb-success-title { font-family:'Cinzel',serif; font-size:1.25rem; font-weight:700; color:var(--text,#e8e8e8); text-align:center; margin:0 0 12px; }
  .rb-success-desc { font-family:'Outfit',sans-serif; font-size:0.87rem; color:rgba(255,255,255,0.6); line-height:1.7; text-align:center; margin:0 0 8px; }
  .rb-success-email { font-family:'Outfit',sans-serif; font-size:0.82rem; color:var(--gold,#d4a853); text-align:center; font-weight:600; margin:0; }
`;
