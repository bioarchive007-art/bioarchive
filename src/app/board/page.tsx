'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Calendar, User, FileText, CheckCircle, Info, AlertTriangle, Upload, HelpCircle, Loader2 } from 'lucide-react';
import { CURRICULUM } from '@/data/curriculum';
import { CONFIG } from '@/config';
import { FileRequest, Notice } from '@/types';
import UploadModal from '@/components/UploadModal';

export default function BoardPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [requests, setRequests] = useState<FileRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  const coursesForSem = formSem ? CURRICULUM[formSem] || [] : [];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [noticesRes, requestsRes] = await Promise.all([
        fetch('/api/notices'),
        fetch('/api/requests'),
      ]);
      
      if (noticesRes.ok) setNotices(await noticesRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
    } catch (err) {
      console.error('Failed to load board data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
    if (!formSem || !formCourse || !formFileType || !formName) {
      setFormError('Please fill out all required fields.');
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
        fetchData();
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
      <div className="board-wrapper">
        {/* Sticky Header */}
        <div className="board-header">
          <div className="board-header-inner">
            <a href="/" className="board-back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </a>
            <div className="board-header-info">
              <a href="/" className="board-wordmark">
                <span className="wb">Bio</span>
                <span className="wa">Archive</span>
              </a>
              <h1 className="board-title">Notice Board & Requests</h1>
            </div>
            <button className="btn-gold" onClick={() => setRequestModalOpen(true)}>
              <Plus size={15} /> Make a Request
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="board-content">
          {loading ? (
            <div className="board-loading">
              <Loader2 size={36} className="spinner" />
              <span>Loading Notice Board & Requests...</span>
            </div>
          ) : (
            <div className="board-grid">
              {/* Notices Column */}
              <div className="board-column">
                <div className="column-title-wrap">
                  <span className="title-accent info" />
                  <h3>Notice Board 📌</h3>
                </div>
                <div className="column-body notices-list">
                  {notices.length === 0 ? (
                    <div className="empty-card">
                      <Info size={36} />
                      <p>No active notices at this time.</p>
                    </div>
                  ) : (
                    notices.map((notice) => (
                      <div key={notice.id} className={`notice-card ${notice.type}`}>
                        <div className="notice-card-header">
                          <span className="notice-type-badge">
                            {notice.type === 'warning' ? <AlertTriangle size={12} /> : <Info size={12} />}
                            {notice.type.toUpperCase()}
                          </span>
                          <span className="notice-date">{notice.date}</span>
                        </div>
                        <h4 className="notice-card-title">{notice.title}</h4>
                        <p className="notice-card-content">{notice.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Requests Column */}
              <div className="board-column">
                <div className="column-title-wrap">
                  <span className="title-accent request" />
                  <h3>Need Files Board 💬</h3>
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
                              <Calendar size={12} style={{ marginRight: 4 }} />
                              {req.requestDate}
                            </span>
                          </div>
                          <h4 className="request-course-name">{req.courseName}</h4>
                          
                          <div className="request-detail">
                            <span className="req-label">Needed:</span>
                            <span className="req-val-badge" style={{ background: cat.colorHex + '18', color: cat.colorHex }}>
                              {cat.emoji} {cat.label} ({req.year})
                            </span>
                          </div>

                          {req.remarks && (
                            <p className="request-remarks">&ldquo;{req.remarks}&rdquo;</p>
                          )}

                          <div className="request-footer">
                            <span className="request-by">
                              <User size={12} style={{ marginRight: 4 }} />
                              By {req.uploaderName}
                            </span>
                            
                            {isPending ? (
                              <button
                                className="request-upload-btn"
                                onClick={() => handleOpenUploadForRequest(req)}
                              >
                                <Upload size={12} />
                                <span>I can upload this</span>
                              </button>
                            ) : (
                              <span className="request-fulfilled-badge">
                                <CheckCircle size={13} style={{ marginRight: 4 }} />
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
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal (for fulfilling a request) */}
      <UploadModal
        isOpen={uploadOpen}
        onClose={() => { setUploadOpen(false); fetchData(); }}
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

                <label className="um-label">Year of Exam / Material</label>
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
                        <span>{cat.emoji}</span>
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
                    disabled={submittingRequest}
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
        .board-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .board-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(10, 26, 15, 0.88);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--glass-border);
        }
        .board-header-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .board-back {
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
        .board-back:hover { background: var(--glass-hover); color: var(--text); }
        .board-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .board-wordmark {
          font-family: 'Cormorant Garamond', serif;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .wb { color: var(--green-light); font-style: italic; }
        .wa { color: rgba(255,255,255,0.4); }
        .board-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          line-height: 1.1;
        }
        @media (max-width: 600px) {
          .board-header-inner { padding: 12px 14px; gap: 8px; }
          .board-back span { display: none; }
          .board-title { font-size: 1rem; }
        }
        .board-content {
          flex: 1;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          padding: 24px 24px 40px;
        }
        @media (max-width: 600px) {
          .board-content { padding: 16px 12px 32px; }
        }
        .board-loading {
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
        .board-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 820px) {
          .board-grid { grid-template-columns: 1fr; gap: 28px; }
        }
        .board-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
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
        .title-accent.info { background: var(--green-light); }
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
          gap: 12px;
        }
        .empty-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--glass-border);
          border-radius: 14px;
          text-align: center;
          color: var(--text-3);
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem;
        }
        /* --- Notices --- */
        .notice-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 16px;
          transition: border-color 0.2s;
        }
        .notice-card:hover { border-color: rgba(255, 255, 255, 0.12); }
        .notice-card.warning { border-left: 3px solid #ef4444; }
        .notice-card.update { border-left: 3px solid var(--gold); }
        .notice-card.info { border-left: 3px solid var(--green-light); }
        .notice-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .notice-type-badge {
          font-family: 'Outfit', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .warning .notice-type-badge { background: rgba(239, 68, 68, 0.12); color: #f87171; }
        .update .notice-type-badge { background: rgba(212, 168, 83, 0.12); color: var(--gold); }
        .info .notice-type-badge { background: rgba(2, 132, 199, 0.15); color: var(--green-light); }
        .notice-date {
          font-family: 'Outfit', sans-serif;
          font-size: 0.68rem;
          color: var(--text-3);
        }
        .notice-card-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.9rem;
          font-weight: 600;
          color: #f0f0f0;
          margin: 0 0 6px;
        }
        .notice-card-content {
          font-family: 'Outfit', sans-serif;
          font-size: 0.82rem;
          color: var(--text-2);
          line-height: 1.5;
          margin: 0;
        }
        /* --- Requests --- */
        .request-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
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
          font-family: 'Cormorant Garamond', serif;
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
          font-size: 0.78rem;
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
          padding-top: 8px;
        }
        .request-by {
          font-family: 'Outfit', sans-serif;
          font-size: 0.7rem;
          color: var(--text-3);
          display: flex;
          align-items: center;
        }
        .request-upload-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: rgba(2, 132, 199, 0.12);
          border: 1px solid rgba(2, 132, 199, 0.25);
          border-radius: 6px;
          color: var(--green-light);
          font-family: 'Outfit', sans-serif;
          font-size: 0.68rem;
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
          font-size: 0.68rem;
          color: rgba(2, 132, 199, 0.75);
          display: flex;
          align-items: center;
        }
      `}</style>
    </>
  );
}
