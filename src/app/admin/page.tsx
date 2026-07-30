'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowLeft, Check, Trash2, X, RefreshCw, AlertTriangle, FileText, Calendar, User, BookOpen, Settings2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { SheetRow } from '@/types';
import { CONFIG } from '@/config';
import { useAuth } from '@/components/AuthProvider';
import { formatFileProfessors } from '@/lib/utils';

export default function AdminPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [adminToken, setAdminToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'controller'>('pending');
  const [files, setFiles] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Site Configuration Toggles state
  const [config, setConfig] = useState({
    collectEmails: true,
    collectUserAgents: true,
    collectTimestamps: true,
    renameFiles: true,
    requireModeration: true,
    restrictToInstitutionalEmail: true,
    enableFilePreviews: true,
    enableReferenceBooks: true,
    enableUploads: true,
    enableFileRequests: true,
    enableNotices: true,
    enableSearch: true,
    enableDownloadLogging: true,
    enableContactForm: true,
    enableDownloads: true,
    requireNiserToUpload: true,
    requireNiserToDownload: true,
  });

  const { user, idToken, triggerLogin } = useAuth();

  // Load site config
  useEffect(() => {
    fetch('/api/admin/config')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Config failed to load');
      })
      .then((data) => setConfig(data))
      .catch((err) => console.error('Failed to load initial config:', err));
  }, []);

  // Read token from sessionStorage on mount/login
  useEffect(() => {
    const cached = sessionStorage.getItem('bioarchive:adminToken');
    if (cached && idToken) {
      setAdminToken(cached);
      setTokenInput(cached);
      verifyAndLoad(cached, idToken);
    }
  }, [idToken]);

  const verifyAndLoad = async (token: string, currentIdToken: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentIdToken}`
        },
        body: JSON.stringify({ adminToken: token }),
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data);
        setIsAuthenticated(true);
        sessionStorage.setItem('bioarchive:adminToken', token);
        setAdminToken(token);
      } else {
        const errData = await res.json().catch(() => ({ error: 'Verification failed' }));
        setError(errData.error || 'Authentication failed');
        setIsAuthenticated(false);
        sessionStorage.removeItem('bioarchive:adminToken');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    if (!idToken) {
      setError('Google Sign-In session not found. Please log in first.');
      return;
    }
    verifyAndLoad(tokenInput.trim(), idToken);
  };

  const handleApprove = async (fileId: string, driveFileId: string) => {
    if (!idToken) return;
    setActionLoading(fileId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ fileId, driveFileId, adminToken }),
      });

      if (res.ok) {
        setSuccessMsg('File approved successfully and moved to curriculum folder.');
        verifyAndLoad(adminToken, idToken);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to approve file');
      }
    } catch (err) {
      setError('Network error. Failed to approve.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (fileId: string, driveFileId: string) => {
    if (!idToken) return;
    if (!confirm('Are you sure you want to permanently delete/reject this file? This will remove it from Sheets and Drive.')) return;
    setActionLoading(fileId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ fileId, driveFileId, adminToken }),
      });

      if (res.ok) {
        setSuccessMsg('File rejected and permanently deleted.');
        verifyAndLoad(adminToken, idToken);
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to delete file');
      }
    } catch (err) {
      setError('Network error. Failed to delete.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleConfig = async (key: string, value: boolean) => {
    if (!idToken) return;
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ adminToken, config: newConfig }),
      });
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Failed to update configuration');
        // Revert UI toggle on error
        setConfig(config);
      } else {
        setSuccessMsg('Feature flags updated in Sheets database successfully.');
      }
    } catch (err) {
      setError('Network error. Failed to save feature configurations.');
      setConfig(config);
    }
  };

  const toggleGroups = {
    logging: [
      { key: 'collectEmails' as const, label: 'Collect Email Addresses', desc: 'Record user email IDs in download & login history sheets. If disabled, entries are logged as \'Anonymous\'.' },
      { key: 'collectUserAgents' as const, label: 'Collect Device User Agents', desc: 'Track browser headers in download & login logs. If disabled, entries are logged as \'Omitted\'.' },
      { key: 'collectTimestamps' as const, label: 'Collect Timestamps', desc: 'Log exact date and time of file downloads and logins. If disabled, entries are logged as \'Omitted\'.' },
      { key: 'renameFiles' as const, label: 'Rename Uploaded Files', desc: 'Format file names into canonical abbreviations (e.g., COURSE_PROF_notes_2026). If disabled, retains raw filenames.' },
      { key: 'requireModeration' as const, label: 'Require Moderator Approval', desc: 'New uploads go to the moderation queue first. If disabled, files bypass quarantine and are approved instantly.' },
      { key: 'restrictToInstitutionalEmail' as const, label: 'Restrict to @niser.ac.in', desc: 'Only users with institutional @niser.ac.in email domains can log in. If disabled, domain restrictions are relaxed.' },
      { key: 'enableDownloadLogging' as const, label: 'Log Detailed Download Entries', desc: 'Record details of user download requests to the Sheets logs. If disabled, skips logging download details but increments count.' },
      { key: 'requireNiserToUpload' as const, label: 'Require @niser.ac.in to Upload', desc: 'Enforce that only users with an institutional @niser.ac.in email can upload study materials.' },
      { key: 'requireNiserToDownload' as const, label: 'Require @niser.ac.in to Download', desc: 'Enforce that only users with an institutional @niser.ac.in email can download study materials and textbooks.' }
    ],
    features: [
      { key: 'enableFilePreviews' as const, label: 'Enable In-App Previews', desc: 'Enable full-screen centered PDF and slides previewing. If disabled, hide preview buttons.' },
      { key: 'enableReferenceBooks' as const, label: 'Enable Reference Books Section', desc: 'Show the Reference Books tab in each course page. Books are gated behind @niser.ac.in login. If disabled, the Books section is hidden entirely.' },
      { key: 'enableUploads' as const, label: 'Enable Materials Upload', desc: 'Allow users to submit new materials. If disabled, hide upload buttons and block uploads.' },
      { key: 'enableFileRequests' as const, label: 'Enable Materials Request Board', desc: 'Show request board link and allow users to submit requests. If disabled, hide page and block requests.' },
      { key: 'enableNotices' as const, label: 'Enable Announcement Notice Board', desc: 'Show notice board page with system announcements. If disabled, hide page.' },
      { key: 'enableSearch' as const, label: 'Enable Landing Page Search', desc: 'Show global search bar on landing page. If disabled, hide search bar.' },
      { key: 'enableContactForm' as const, label: 'Enable Moderator Contact Form', desc: 'Show contact/feedback form page and allow submission. If disabled, hide page.' },
      { key: 'enableDownloads' as const, label: 'Enable Materials Download', desc: 'Allow users to download course materials and textbooks. If disabled, hide download buttons and block downloads.' }
    ]
  };

  const renderToggle = (key: keyof typeof config, label: string, description: string) => {
    const isEnabled = config[key];
    return (
      <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          <span style={{ fontSize: '0.86rem', color: '#e0e0e0', fontWeight: 600 }}>{label}</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{description}</span>
        </div>
        <button
          onClick={() => handleToggleConfig(key, !isEnabled)}
          style={{
            width: '50px',
            height: '26px',
            borderRadius: '13px',
            background: isEnabled ? 'var(--green-light)' : 'rgba(255,255,255,0.08)',
            border: 'none',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.2s',
            outline: 'none',
            flexShrink: 0
          }}
        >
          <div style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#fff',
            position: 'absolute',
            top: '3px',
            left: isEnabled ? '27px' : '3px',
            transition: 'left 0.2s'
          }} />
        </button>
      </div>
    );
  };

  const pendingFiles = files.filter(f => f.status === 'pending_approval');
  const approvedFiles = files.filter(f => f.status === 'approved' || !f.status);

  return (
    <>
      <Navbar onUploadClick={() => {}} />

      <div className="admin-wrapper" style={{ minHeight: 'calc(100vh - var(--nav-h))', display: 'flex', flexDirection: 'column' }}>
        
        {/* Sticky Header */}
        <div className="admin-header" style={{
          position: 'sticky',
          top: 'var(--nav-h)',
          zIndex: 40,
          background: 'rgba(3, 10, 24, 0.45)',
          backdropFilter: 'var(--glass-blur)',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <div className="admin-header-inner" style={{
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px'
          }}>
            <Link href="/" className="admin-back" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '0.82rem',
              color: 'var(--text-2)',
              padding: '6px 10px',
              borderRadius: '8px',
              transition: 'all 0.15s'
            }}>
              <ArrowLeft size={16} />
              <span>Back to Site</span>
            </Link>
            <h1 className="admin-title" style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '1.2rem',
              color: '#f0f0f0',
              fontWeight: 700,
              margin: 0
            }}>
              Moderation Panel
            </h1>
            {isAuthenticated && (
              <button
                className="btn-ghost"
                onClick={() => idToken && verifyAndLoad(adminToken, idToken)}
                style={{ padding: '6px 12px', fontSize: '0.74rem' }}
                disabled={loading}
              >
                <RefreshCw size={12} className={loading ? 'spinner' : ''} style={{ marginRight: '4px', display: 'inline' }} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="admin-content" style={{
          flex: 1,
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
          padding: '32px 24px 60px'
        }}>
          
          {/* Notifications */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="um-error"
                style={{ marginBottom: '20px' }}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </motion.div>
            )}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '10px',
                  color: '#34d399',
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '0.82rem',
                  marginBottom: '20px'
                }}
              >
                <Check size={16} />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Security Layer 1: Google SSO check */}
          {!user ? (
            <div className="auth-card-wrap" style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="um-panel"
                style={{ maxWidth: '440px', width: '100%', padding: '36px 28px', textAlign: 'center' }}
              >
                <div className="lock-icon-wrap" style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  color: '#ef4444'
                }}>
                  <Lock size={22} style={{ margin: 'auto' }} />
                </div>
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.2rem', color: '#f0f0f0', marginBottom: '8px' }}>
                  Admin Authorization Required
                </h2>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.84rem', color: 'var(--text-2)', lineHeight: '1.5', marginBottom: '24px' }}>
                  To access the administrative functions, you must first verify your identity with your Google SSO account. Only registered administrator emails can proceed.
                </p>
                <button
                  onClick={() => triggerLogin()}
                  className="btn-gold"
                  style={{ width: '100%', justifyContent: 'center', fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
                >
                  Verify Google SSO
                </button>
              </motion.div>
            </div>
          ) : /* Security Layer 2: Admin delete token check */
          !isAuthenticated ? (
            <div className="auth-card-wrap" style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '60px 0'
            }}>
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="um-panel"
                style={{ maxWidth: '400px', width: '100%', padding: '36px 28px', textAlign: 'center' }}
              >
                <div className="lock-icon-wrap" style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'rgba(218, 165, 32, 0.08)',
                  border: '1px solid rgba(218, 165, 32, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px',
                  color: '#daa520'
                }}>
                  <Lock size={22} style={{ margin: 'auto' }} />
                </div>
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.2rem', color: '#f0f0f0', marginBottom: '8px' }}>
                  Token Authorization
                </h2>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '24px' }}>
                  Google SSO verified as <strong>{user.email}</strong>. Enter the secret Admin Token to unlock access.
                </p>

                <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="password"
                    className="um-input"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="Enter admin token..."
                    required
                    style={{ textAlign: 'center', letterSpacing: '0.12em' }}
                  />
                  <button
                    type="submit"
                    className="btn-gold"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={loading}
                  >
                    {loading ? 'Authorizing...' : 'Verify Admin Token'}
                  </button>
                </form>
              </motion.div>
            </div>
          ) : (
            /* Authorized Admin Interface */
            <div className="admin-dashboard">
              
              {/* Tab Selector */}
              <div className="admin-tabs" style={{
                display: 'flex',
                gap: '8px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                paddingBottom: '12px',
                marginBottom: '28px'
              }}>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`um-pill ${activeTab === 'pending' ? 'selected' : ''}`}
                  style={{ fontSize: '0.82rem', padding: '8px 16px', borderRadius: '12px' }}
                >
                  Pending Review ({pendingFiles.length})
                </button>
                <button
                  onClick={() => setActiveTab('approved')}
                  className={`um-pill ${activeTab === 'approved' ? 'selected' : ''}`}
                  style={{ fontSize: '0.82rem', padding: '8px 16px', borderRadius: '12px' }}
                >
                  Approved Registry ({approvedFiles.length})
                </button>
                <button
                  onClick={() => setActiveTab('controller')}
                  className={`um-pill ${activeTab === 'controller' ? 'selected' : ''}`}
                  style={{ fontSize: '0.82rem', padding: '8px 16px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Settings2 size={13} />
                  Feature Controller
                </button>
              </div>

              {/* TABS BODY */}
              <div className="tab-content">
                
                {/* 1. PENDING REVIEW QUEUE */}
                {activeTab === 'pending' && (
                  <div className="pending-queue-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {pendingFiles.length === 0 ? (
                      <div className="empty-card" style={{ padding: '60px 20px', background: 'var(--panel)', border: '1px dashed var(--glass-border)' }}>
                        <BookOpen size={40} style={{ color: 'var(--text-3)', marginBottom: '12px' }} />
                        <p style={{ margin: 0, fontFamily: "'Outfit', sans-serif", color: 'var(--text-3)' }}>
                          No files waiting for approval. The moderation queue is empty!
                        </p>
                      </div>
                    ) : (
                      pendingFiles.map((file) => {
                        const cat = CONFIG.FILE_CATEGORIES[file.fileType as keyof typeof CONFIG.FILE_CATEGORIES] || CONFIG.FILE_CATEGORIES.other;
                        return (
                          <motion.div
                            key={file.fileId}
                            layout
                            className="request-card"
                            style={{
                              background: 'var(--panel)',
                              border: '1px solid var(--glass-border)',
                              borderRadius: '16px',
                              padding: '24px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px'
                            }}
                          >
                            <div className="pending-card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span className="request-course-code" style={{ fontSize: '0.74rem', color: '#daa520', fontWeight: 600 }}>
                                  {file.courseCode} · {file.semester === 'ADVANCE COURSES' ? 'Advanced' : `Sem ${file.semester}`}
                                </span>
                                <h4 style={{ fontFamily: "'Cinzel', serif", color: '#f0f0f0', fontSize: '1.05rem', margin: 0 }}>
                                  {file.courseName}
                                </h4>
                              </div>
                              <span className="req-val-badge" style={{ background: cat.colorHex + '18', color: cat.colorHex, fontSize: '0.68rem', padding: '2px 8px', borderRadius: '6px' }}>
                                {cat.label}
                              </span>
                            </div>

                            <div className="pending-file-info" style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              borderRadius: '10px',
                              padding: '12px 16px',
                              fontSize: '0.8rem',
                              fontFamily: "'Outfit', sans-serif"
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e0e0e0', wordBreak: 'break-all', marginBottom: '6px' }}>
                                <FileText size={14} style={{ color: 'var(--green-light)', flexShrink: 0 }} />
                                <strong>File:</strong> {file.fileName}
                              </div>
                              <div style={{ display: 'flex', gap: '16px', color: 'var(--text-3)', fontSize: '0.74rem' }}>
                                <span><strong>Prof:</strong> {formatFileProfessors(file)}</span>
                                <span><strong>Year:</strong> {file.year}</span>
                                {file.examType && <span><strong>Exam:</strong> {file.examType}</span>}
                              </div>
                            </div>

                            {file.remarks && (
                              <p className="request-remarks" style={{ fontSize: '0.78rem', margin: '4px 0', borderLeft: '2px solid rgba(255,255,255,0.06)', paddingLeft: '8px', color: 'var(--text-2)' }}>
                                &ldquo;{file.remarks}&rdquo;
                              </p>
                            )}

                            <div className="pending-card-footer" style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderTop: '1px solid rgba(255,255,255,0.05)',
                              paddingTop: '14px',
                              marginTop: '4px'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span className="request-by" style={{ fontSize: '0.72rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <User size={12} />
                                  By {file.uploaderName || 'Anonymous'}
                                </span>
                                <span style={{ fontSize: '0.66rem', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Calendar size={11} />
                                  Uploaded {file.uploadDate}
                                </span>
                              </div>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="request-upload-btn"
                                  onClick={() => handleApprove(file.fileId, file.driveFileId)}
                                  disabled={actionLoading === file.fileId}
                                  style={{ background: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#10B981', cursor: 'pointer', outline: 'none' }}
                                >
                                  {actionLoading === file.fileId ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                  className="request-upload-btn"
                                  onClick={() => handleReject(file.fileId, file.driveFileId)}
                                  disabled={actionLoading === file.fileId}
                                  style={{ background: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#ef4444', cursor: 'pointer', outline: 'none' }}
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 2. APPROVED REGISTRY LIST */}
                {activeTab === 'approved' && (
                  <div className="approved-registry-wrap" style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    overflow: 'hidden'
                  }}>
                    <div className="table-responsive" style={{ overflowX: 'auto' }}>
                      <table className="sft-table" style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th className="sft-th" style={{ padding: '12px 16px' }}>Course</th>
                            <th className="sft-th">File Name</th>
                            <th className="sft-th">Professor</th>
                            <th className="sft-th">Uploader</th>
                            <th className="sft-th">Downloads</th>
                            <th className="sft-th" style={{ width: '80px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvedFiles.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-3)', fontFamily: "'Outfit', sans-serif" }}>
                                No approved files in the registry.
                              </td>
                            </tr>
                          ) : (
                            approvedFiles.map((file) => (
                              <tr key={file.fileId} className="sft-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td className="sft-td" style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                                  <span style={{ fontWeight: 600, color: '#daa520' }}>{file.courseCode}</span>
                                  <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-3)' }}>Sem {file.semester}</span>
                                </td>
                                <td className="sft-td" style={{ verticalAlign: 'middle', maxWidth: '300px' }}>
                                  <span style={{
                                    display: 'block',
                                    color: '#e0e0e0',
                                    fontSize: '0.8rem',
                                    overflowWrap: 'break-word',
                                    wordBreak: 'break-word',
                                    lineHeight: '1.3'
                                  }} title={file.fileName}>
                                    {file.fileName}
                                  </span>
                                  <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.64rem', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px', padding: '1px 6px' }}>
                                    {file.fileType.toUpperCase()}
                                  </span>
                                </td>
                                <td className="sft-td" style={{ verticalAlign: 'middle', fontSize: '0.78rem', color: 'var(--text-2)' }}>{formatFileProfessors(file)}</td>
                                <td className="sft-td" style={{ verticalAlign: 'middle', fontSize: '0.78rem', color: 'var(--text-2)' }}>{file.uploaderName || 'Anonymous'}</td>
                                <td className="sft-td" style={{ verticalAlign: 'middle', fontSize: '0.78rem', color: 'var(--text-3)', textAlign: 'center' }}>{file.downloadCount}</td>
                                <td className="sft-td" style={{ verticalAlign: 'middle' }}>
                                  <button
                                    onClick={() => handleReject(file.fileId, file.driveFileId)}
                                    disabled={actionLoading === file.fileId}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px',
                                      borderRadius: '6px',
                                      border: '1px solid rgba(239, 68, 68, 0.15)',
                                      background: 'rgba(239, 68, 68, 0.03)',
                                      color: '#f77171',
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                      margin: '0 auto'
                                    }}
                                    title="Delete/Reject"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. FEATURE TOGGLES CONTROLLER */}
                {activeTab === 'controller' && (
                  <div className="controller-card" style={{
                    background: 'var(--panel)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px',
                    fontFamily: "'Outfit', sans-serif"
                  }}>
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px', marginBottom: '8px' }}>
                      <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: '1.15rem', color: '#f0f0f0', margin: 0 }}>
                        Website Feature Controller
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', margin: '4px 0 0' }}>
                        Centrally control database logging parameters, anonymity options, and core page/UI features.
                      </p>
                    </div>

                    {/* Section 1: Logging & Security */}
                    <div>
                      <h4 style={{ color: 'var(--gold)', fontSize: '0.88rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                        Security & Data Logging
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {toggleGroups.logging.map((t) => renderToggle(t.key, t.label, t.desc))}
                      </div>
                    </div>

                    {/* Section 2: UI Features */}
                    <div style={{ marginTop: '12px' }}>
                      <h4 style={{ color: 'var(--green-light)', fontSize: '0.88rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                        User Interface Features
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {toggleGroups.features.map((t) => renderToggle(t.key, t.label, t.desc))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>

      <style jsx global>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .dropdown-item-hover:hover {
          background: rgba(255, 255, 255, 0.04) !important;
        }
      `}</style>
    </>
  );
}
