'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Download, User, Calendar, FileText, Bookmark } from 'lucide-react';
import { SheetRow } from '@/types';

interface FilePreviewModalProps {
  file: SheetRow | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: SheetRow) => void;
}

export default function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!file) return null;

  // Google Drive preview URL format
  const previewUrl = file.driveWebViewLink
    ? file.driveWebViewLink.replace(/\/view.*$/, '/preview')
    : `https://drive.google.com/file/d/${file.driveFileId}/preview`;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="portal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{ zIndex: 9999, position: 'fixed', inset: 0 }}
        >
          <motion.div
            className="portal-window preview-modal-window"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '90%',
              maxWidth: '1000px',
              height: '85vh',
              background: 'var(--panel)',
              border: '1px solid var(--glass-border-hover)',
              borderRadius: '20px',
              boxShadow: 'var(--glass-shadow-hover)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div className="preview-modal-header" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: 'rgba(3, 10, 24, 0.3)',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <FileText size={18} className="cc-code" style={{ color: '#daa520', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <h3 style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#e0e0e0',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }} title={file.fileName}>
                    {file.fileName}
                  </h3>
                  <span style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-3)',
                    fontFamily: "'Outfit', sans-serif"
                  }}>
                    {file.courseCode} · {file.professor} · {file.year}
                  </span>
                </div>
              </div>

              {/* Action items */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button
                  onClick={() => onDownload(file)}
                  className="sfi-action-btn sfi-dl"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title="Download File"
                >
                  <Download size={14} />
                </button>
                <a
                  href={file.driveWebViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="sfi-action-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'var(--text-2)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title="Open in New Tab"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={onClose}
                  className="sfi-action-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 0, 0, 0.15)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    color: '#f87171',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title="Close Preview"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="preview-modal-body" style={{
              flex: 1,
              display: 'flex',
              height: 'calc(100% - 65px)',
              background: '#020612'
            }}>
              {/* PDF Preview Frame */}
              <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                <iframe
                  src={previewUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  allow="autoplay"
                  title="File Preview"
                />
              </div>

              {/* Sidebar metadata Details (Hidden on mobile) */}
              <div className="preview-sidebar" style={{
                width: '280px',
                borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'rgba(3, 10, 24, 0.2)',
                fontFamily: "'Outfit', sans-serif"
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Uploaded By</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                    <User size={13} style={{ color: '#daa520' }} />
                    <span>{file.uploaderName || 'Anonymous'}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Upload Date</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                    <Calendar size={13} style={{ color: '#daa520' }} />
                    <span>{file.uploadDate}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.66rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Material Type</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                    <Bookmark size={13} style={{ color: '#daa520' }} />
                    <span style={{ textTransform: 'capitalize' }}>{file.fileType === 'qpaper' ? 'Question Paper' : file.fileType}</span>
                  </div>
                </div>

                {file.remarks && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Moderator Notes</span>
                    <p style={{
                      margin: 0,
                      fontSize: '0.76rem',
                      color: 'var(--text-2)',
                      fontStyle: 'italic',
                      lineHeight: '1.4',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '8px'
                    }}>
                      &ldquo;{file.remarks}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      <style jsx>{`
        @media (max-width: 768px) {
          .preview-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
