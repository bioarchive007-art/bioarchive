'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Calendar, User, FileText, CheckCircle, HelpCircle, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { CONFIG } from '@/config';
import { FileRequest } from '@/types';
import UploadModal from '@/components/UploadModal';
import { useAuth } from '@/components/AuthProvider';

export default function RequestsPage() {
  const [requests, setRequests] = useState<FileRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { siteConfig } = useAuth();

  if (siteConfig?.enableFileRequests === false) {
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
          <AlertTriangle size={48} style={{ color: 'var(--gold)', marginBottom: '20px' }} />
          <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.3rem', color: '#f0f0f0', marginBottom: '12px' }}>
            Requests Board Offline
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-3)', lineHeight: '1.6', marginBottom: '24px' }}>
            The materials request system is currently disabled by the site administrator. Please check back later.
          </p>
          <Link href="/" className="btn-gold" style={{ display: 'inline-flex', justifyContent: 'center', width: '100%' }}>
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  // Prefill states for UploadModal
  const [prefill, setPrefill] = useState({
    courseCode: '',
    semester: '',
    fileType: '',
    requestId: '',
  });

  // Request Form State
  const [formSem, setFormSem] = useState('');
  const [formCourse, setFormCourse] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear().toString());
  const [formFileType, setFormFileType] = useState('');
  const [formName, setFormName] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [formError, setFormError] = useState('');

  const isValidYear = useMemo(() => {
    if (!formYear) return false;
    const y = parseInt(formYear, 10);
    return /^\d{4}$/.test(formYear) && !isNaN(y) && y <= new Date().getFullYear();
  }, [formYear]);

  const coursesForSem = formSem ? CURRICULUM[formSem] || [] : [];

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/requests');
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenUploadForRequest = (req: FileRequest) => {
    setPrefill({
      courseCode: req.courseCode,
      semester: req.semester,
      fileType: req.fileType,
      requestId: req.requestId,
    });
    setUploadOpen(true);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSem || !formCourse || !formFileType || !formName || !isValidYear) {
      setFormError('Please fill out all required fields and ensure the year is valid (no future years allowed).');
      return;
    }

    const selectedCourseObj = CURRICULUM[formSem]?.find(c => c.code === formCourse);
    const courseName = selectedCourseObj?.name || '';

    try {
      setSubmittingRequest(true);
      setFormError('');
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseCode: formCourse,
          courseName,
          semester: formSem,
          year: formYear,
          fileType: formFileType,
          uploaderName: formName,
          remarks: formRemarks,
        }),
      });

      if (res.ok) {
        setRequestModalOpen(false);
        // Reset form
        setFormSem('');
        setFormCourse('');
        setFormFileType('');
        setFormRemarks('');
        setFormName('');
        // Refresh requests list
        fetchRequests();
      } else {
        const err = await res.json();
        setFormError(err.error || 'Failed to submit request');
      }
    } catch (err) {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <>
      <div className="requests-wrapper">
        {/* Sticky Header */}
        <div className="requests-header">
          <div className="requests-header-inner">
            <Link href="/" className="requests-back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </Link>
            <div className="requests-header-info">
              <Link href="/" className="navbar-wordmark">
                <span className="wordmark-bio">Bio</span>
                <span className="wordmark-archive">Archive</span>
              </Link>
              <h1 className="requests-title">Material Requests</h1>
            </div>
            <button className="btn-gold" onClick={() => setRequestModalOpen(true)}>
              <Plus size={15} /> Make a Request
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="requests-content">
          {loading ? (
            <div className="requests-loading">
              <Loader2 size={36} className="spinner" />
              <span>Loading Requests Board...</span>
            </div>
          ) : (
            <div className="requests-column">
              <div className="column-title-wrap">
                <span className="title-accent request" />
                <h3>Need Files Board</h3>
              </div>
              <div className="column-body requests-list">
                {requests.length === 0 ? (
                  <div className="empty-card">
                    <HelpCircle size={36} />
                    <p>No active material requests. Everything is up to date!</p>
                  </div>
                ) : (
                  requests.map((req) => {
                    const cat = CONFIG.FILE_CATEGORIES[req.fileType as keyof typeof CONFIG.FILE_CATEGORIES] || CONFIG.FILE_CATEGORIES.other;
                    const isPending = req.status === 'pending';

                    return (
                      <div key={req.requestId} className={`request-card ${req.status}`}>
                        <div className="request-card-header">
                          <span className="request-course-code">{req.courseCode}</span>
                          <span className="request-date">
                            <Calendar size={12} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
                            {req.requestDate}
                          </span>
                        </div>
                        <h4 className="request-course-name">{req.courseName}</h4>

                        <div className="request-detail">
                          <span className="req-label">Needed:</span>
                          <span className="req-val-badge" style={{ background: cat.colorHex + '18', color: cat.colorHex }}>
                            {cat.label} ({req.year})
                          </span>
                        </div>

                        {req.remarks && (
                          <p className="request-remarks">&ldquo;{req.remarks}&rdquo;</p>
                        )}

                        <div className="request-footer">
                          <span className="request-by">
                            <User size={12} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
                            By {req.uploaderName}
                          </span>

                          {isPending ? (
                             siteConfig?.enableUploads !== false ? (
                               <button
                                 className="request-upload-btn"
                                 onClick={() => handleOpenUploadForRequest(req)}
                               >
                                 <Upload size={12} />
                                 <span>I can upload this</span>
                               </button>
                             ) : (
                               <span className="request-fulfilled-badge" style={{ color: 'var(--text-3)' }}>
                                 Pending
                               </span>
                             )
                          ) : (
                            <span className="request-fulfilled-badge">
                              <CheckCircle size={13} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
                              Fulfilled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal (for fulfilling a request) */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => { setUploadOpen(false); fetchRequests(); }}
        initialCourseCode={prefill.courseCode}
        initialSemester={prefill.semester}
        initialFileType={prefill.fileType}
        initialRequestId={prefill.requestId}
      />

      {/* Request Modal */}
      <AnimatePresence>
        {requestModalOpen && (
          <motion.div
            className="um-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRequestModalOpen(false)}
          >
            <motion.div
              className="um-panel"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="um-close" onClick={() => setRequestModalOpen(false)}><Plus style={{ transform: 'rotate(45deg)' }} size={18} /></button>

              <div className="um-header">
                <HelpCircle size={20} className="um-header-icon" />
                <h2 className="um-title">Request Course Material</h2>
              </div>

              {formError && (
                <div className="um-error">
                  <AlertTriangle size={14} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateRequest} className="um-body">
                <label className="um-label">Semester</label>
                <div className="um-sem-row">
                  {[...CONFIG.NISER_SEMESTERS.map(String), 'ADVANCE COURSES'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`um-pill ${formSem === s ? 'selected' : ''}`}
                      onClick={() => { setFormSem(s); setFormCourse(''); }}
                    >
                      {s === 'ADVANCE COURSES' ? 'ADV' : `Sem ${s}`}
                    </button>
                  ))}
                </div>

                {formSem && (
                  <>
                    <label className="um-label">Course</label>
                    <select
                      className="um-select"
                      value={formCourse}
                      onChange={(e) => setFormCourse(e.target.value)}
                      required
                    >
                      <option value="">Select course...</option>
                      {coursesForSem.map((c) => (
                        <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                      ))}
                    </select>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="um-label">Year of Exam / Material</label>
                  {formYear && formYear.length === 4 && !isValidYear && (
                    <span style={{ color: '#f87171', fontSize: '0.7rem', fontFamily: "'Outfit', sans-serif" }}>
                      {parseInt(formYear, 10) > new Date().getFullYear() ? "Future year is not allowed" : "Invalid year"}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  className="um-input"
                  value={formYear}
                  onChange={(e) => setFormYear(e.target.value)}
                  placeholder="e.g. 2024"
                  maxLength={4}
                  required
                />

                <label className="um-label">Material Type</label>
                <div className="um-type-grid">
                  {Object.keys(CONFIG.FILE_CATEGORIES).map((key) => {
                    const cat = CONFIG.FILE_CATEGORIES[key as keyof typeof CONFIG.FILE_CATEGORIES];
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`um-type-btn ${formFileType === key ? 'selected' : ''}`}
                        onClick={() => setFormFileType(key)}
                        style={formFileType === key ? { borderColor: cat.colorHex, background: cat.colorHex + '15' } : {}}
                      >
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                <label className="um-label">Your Name</label>
                <input
                  type="text"
                  className="um-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />

                <label className="um-label">Remarks / Description</label>
                <textarea
                  className="um-textarea"
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Specify exactly what questions or topics you need..."
                  rows={3}
                />

                <div className="um-footer" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }} />
                  <button
                    type="submit"
                    className="btn-gold"
                    disabled={submittingRequest || !isValidYear}
                  >
                    {submittingRequest ? <Loader2 size={14} className="spinner" /> : <Plus size={14} />}
                    Submit Request
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .requests-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .requests-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3, 10, 24, 0.45);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border-bottom: 1px solid var(--glass-border);
        }
        .requests-header-inner {
          max-width: 700px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .requests-back {
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
        .requests-back:hover { background: var(--glass-hover); color: var(--text); }
        .requests-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .requests-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          line-height: 1.1;
        }
        @media (max-width: 600px) {
          .requests-header-inner { padding: 12px 14px; gap: 8px; }
          .requests-back span { display: none; }
          .requests-title { font-size: 1rem; }
        }
        .requests-content {
          flex: 1;
          max-width: 700px;
          margin: 0 auto;
          width: 100%;
          padding: 24px 24px 40px;
        }
        @media (max-width: 600px) {
          .requests-content { padding: 16px 12px 32px; }
        }
        .requests-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 100px 20px;
          color: var(--text-3);
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem;
        }
        .spinner {
          animation: spin 1s linear infinite;
          color: var(--green-light);
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .requests-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .column-title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .title-accent {
          width: 4px;
          height: 18px;
          border-radius: 2px;
        }
        .title-accent.request { background: var(--gold); }
        .column-title-wrap h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 0.98rem;
          font-weight: 600;
          color: #f0f0f0;
          margin: 0;
        }
        .column-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .empty-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 20px;
          background: var(--glass);
          border: 1px dashed var(--glass-border);
          border-radius: 16px;
          text-align: center;
          color: var(--text-3);
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem;
        }
        .request-card {
          background: var(--panel);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          position: relative;
          transition: transform 0.4s var(--ease-out), border-color 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
          box-shadow: var(--glass-shadow);
        }
        .request-card:hover {
          transform: translateY(-4px);
          border-color: var(--glass-border-hover);
          box-shadow: var(--glass-shadow-hover);
        }
        .request-card.fulfilled { opacity: 0.65; border-color: rgba(255, 255, 255, 0.03); }
        .request-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .request-course-code {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--gold);
          letter-spacing: 0.04em;
        }
        .request-date {
          font-family: 'Outfit', sans-serif;
          font-size: 0.68rem;
          color: var(--text-3);
          display: flex;
          align-items: center;
        }
        .request-course-name {
          font-family: 'Cinzel', serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: #f0f0f0;
          margin: 0;
          line-height: 1.2;
        }
        .request-detail {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.78rem;
        }
        .req-label { color: var(--text-3); }
        .req-val-badge {
          font-family: 'Outfit', sans-serif;
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .request-remarks {
          font-family: 'Outfit', sans-serif;
          font-style: italic;
          font-size: 0.8rem;
          color: var(--text-2);
          margin: 4px 0;
          padding-left: 8px;
          border-left: 2px solid rgba(255,255,255,0.06);
        }
        .request-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          padding-top: 10px;
        }
        .request-by {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          color: var(--text-3);
          display: flex;
          align-items: center;
        }
        .request-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: rgba(2, 132, 199, 0.12);
          border: 1px solid rgba(2, 132, 199, 0.25);
          border-radius: 6px;
          color: var(--green-light);
          font-family: 'Outfit', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .request-upload-btn:hover {
          background: rgba(2, 132, 199, 0.22);
          color: #fff;
          border-color: rgba(2, 132, 199, 0.4);
        }
        .request-fulfilled-badge {
          font-family: 'Outfit', sans-serif;
          font-size: 0.7rem;
          color: rgba(2, 132, 199, 0.75);
          display: flex;
          align-items: center;
        }
      `}</style>
    </>
  );
}
