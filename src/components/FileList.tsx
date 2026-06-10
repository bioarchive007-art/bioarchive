'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Download, Eye, X, Calendar, MessageCircle, User,
} from 'lucide-react';
import { SheetRow } from '@/types';
import { CONFIG } from '@/config';
import { fetchFilesByCourse, incrementFileDownloads } from '@/lib/api-client';

interface FileListProps {
  courseCode: string;
  semester: string;
}

const categoryMeta = CONFIG.FILE_CATEGORIES;

function getCategoryStyle(fileType: string) {
  const key = fileType.toLowerCase() as keyof typeof categoryMeta;
  return categoryMeta[key] || categoryMeta.other;
}

export default function FileList({ courseCode, semester }: FileListProps) {
  const [files, setFiles] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchFilesByCourse(courseCode, semester)
      .then((data) => {
        if (!cancelled) setFiles(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [courseCode, semester]);

  const handleDownload = useCallback((file: SheetRow) => {
    incrementFileDownloads(file.fileId);
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.driveFileId}`;
    window.open(downloadUrl, '_blank');
  }, []);

  const handlePreview = useCallback((file: SheetRow) => {
    if (file.driveWebViewLink) {
      const url = file.driveWebViewLink.replace(/\/view.*$/, '/preview');
      setPreviewUrl(url);
    }
  }, []);

  // Skeleton
  if (loading) {
    return (
      <div className="fl-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="fl-skeleton">
            <div className="sk-badge" />
            <div className="sk-title" />
            <div className="sk-line" />
            <div className="sk-line short" />
          </div>
        ))}
        <style jsx>{`
          .fl-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 14px;
          }
          .fl-skeleton {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 14px;
            padding: 18px;
          }
          .sk-badge {
            width: 70px; height: 20px;
            background: rgba(255,255,255,0.06);
            border-radius: 10px;
            margin-bottom: 12px;
            animation: pulse 1.5s ease-in-out infinite;
          }
          .sk-title {
            width: 80%; height: 16px;
            background: rgba(255,255,255,0.06);
            border-radius: 6px;
            margin-bottom: 10px;
            animation: pulse 1.5s ease-in-out infinite 0.1s;
          }
          .sk-line {
            width: 60%; height: 12px;
            background: rgba(255,255,255,0.04);
            border-radius: 4px;
            margin-bottom: 6px;
            animation: pulse 1.5s ease-in-out infinite 0.2s;
          }
          .sk-line.short { width: 40%; }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fl-error">
        <p>{error}</p>
        <style jsx>{`
          .fl-error {
            text-align: center;
            padding: 40px;
            color: #ef4444;
            font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="fl-empty">
        <BookOpen size={40} strokeWidth={1.2} />
        <h3>No files yet</h3>
        <p>Be the first to upload study materials for this course!</p>
        <style jsx>{`
          .fl-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 60px 20px;
            text-align: center;
            color: rgba(255,255,255,0.3);
          }
          .fl-empty h3 {
            font-family: 'Cormorant Garamond', serif;
            font-size: 1.3rem;
            color: rgba(255,255,255,0.5);
            margin: 0;
          }
          .fl-empty p {
            font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
            font-size: 0.85rem;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="fl-grid">
        {files.map((file, idx) => {
          const cat = getCategoryStyle(file.fileType);
          return (
            <motion.div
              key={file.fileId}
              className="fl-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.25 }}
            >
              {/* Badge */}
              <span className="fl-badge" style={{ background: cat.colorHex + '18', color: cat.colorHex }}>
                {cat.label}
              </span>

              {/* Title */}
              <h4 className="fl-title">{file.fileName}</h4>

              {/* Metadata */}
              <div className="fl-meta">
                {file.professor && (
                  <span className="fl-meta-item">
                    <User size={12} /> {file.professor}
                  </span>
                )}
                {file.year && (
                  <span className="fl-meta-item fl-year">
                    <Calendar size={12} /> {file.year}
                  </span>
                )}
              </div>

              {file.remarks && (
                <div className="fl-remarks">
                  <MessageCircle size={11} />
                  <span>{file.remarks}</span>
                </div>
              )}

              {/* Footer */}
              <div className="fl-footer">
                {file.uploaderName && (
                  <span className="fl-uploader">by {file.uploaderName}</span>
                )}
                <div className="fl-actions">
                  {file.driveWebViewLink && (
                    <button
                      className="fl-action-btn"
                      onClick={() => handlePreview(file)}
                      title="Preview"
                    >
                      <Eye size={15} />
                    </button>
                  )}
                  <button
                    className="fl-action-btn fl-dl"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >
                    <Download size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            className="fl-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewUrl(null)}
          >
            <motion.div
              className="fl-preview-panel"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="fl-preview-close"
                onClick={() => setPreviewUrl(null)}
              >
                <X size={20} />
              </button>
              <iframe
                src={previewUrl}
                className="fl-preview-iframe"
                title="File Preview"
                allowFullScreen
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .fl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 14px;
        }
        .fl-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: border-color 0.2s;
        }
        .fl-card:hover {
          border-color: rgba(2, 132, 199, 0.25);
        }
        .fl-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          width: fit-content;
          padding: 3px 10px;
          border-radius: 20px;
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .fl-title {
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.88rem;
          font-weight: 500;
          color: #e8e8e8;
          margin: 0;
          line-height: 1.35;
          word-break: break-word;
        }
        .fl-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .fl-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.45);
        }
        .fl-year {
          background: rgba(218,165,32,0.1);
          color: #daa520;
          padding: 1px 8px;
          border-radius: 10px;
        }
        .fl-remarks {
          display: flex;
          align-items: flex-start;
          gap: 5px;
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.03);
          padding: 6px 10px;
          border-radius: 8px;
          line-height: 1.4;
        }
        .fl-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: auto;
          padding-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }
        .fl-uploader {
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.66rem;
          color: rgba(255,255,255,0.25);
          font-style: italic;
        }
        .fl-actions {
          display: flex;
          gap: 6px;
        }
        .fl-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.15s;
        }
        .fl-action-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
          border-color: rgba(255,255,255,0.15);
        }
        .fl-action-btn.fl-dl:hover {
          background: rgba(2, 132, 199, 0.15);
          color: var(--green-bright);
          border-color: rgba(2, 132, 199, 0.3);
        }
        .fl-preview-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 300;
          padding: 20px;
        }
        .fl-preview-panel {
          position: relative;
          width: 100%;
          max-width: 960px;
          height: 85vh;
          background: rgba(3, 10, 24, 0.96);
          border: 1px solid rgba(2, 132, 199, 0.25);
          border-radius: 16px;
          overflow: hidden;
        }
        .fl-preview-close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          padding: 6px;
          transition: background 0.15s;
        }
        .fl-preview-close:hover { background: rgba(255,0,0,0.3); }
        .fl-preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
      `}</style>
    </>
  );
}
