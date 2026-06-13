'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { Notice } from '@/types';

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notices');
      if (res.ok) {
        setNotices(await res.json());
      }
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  return (
    <>
      <div className="notices-wrapper">
        {/* Sticky Header */}
        <div className="notices-header">
          <div className="notices-header-inner">
            <a href="/" className="notices-back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </a>
            <div className="notices-header-info">
              <a href="/" className="navbar-wordmark">
                <span className="wordmark-bio">Bio</span>
                <span className="wordmark-archive">Archive</span>
              </a>
              <h1 className="notices-title">Notice Board</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="notices-content">
          {loading ? (
            <div className="notices-loading">
              <Loader2 size={36} className="spinner" />
              <span>Loading Notices...</span>
            </div>
          ) : (
            <div className="notices-column">
              <div className="column-title-wrap">
                <span className="title-accent info" />
                <h3>Latest Announcements</h3>
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
                        <span className="notice-date">
                          <Calendar size={12} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
                          {notice.date}
                        </span>
                      </div>
                      <h4 className="notice-card-title">{notice.title}</h4>
                      <p className="notice-card-content">{notice.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .notices-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .notices-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3, 10, 24, 0.97);
          border-bottom: 1px solid var(--glass-border);
        }
        .notices-header-inner {
          max-width: 700px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .notices-back {
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
        .notices-back:hover { background: var(--glass-hover); color: var(--text); }
        .notices-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .notices-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          line-height: 1.1;
        }
        @media (max-width: 600px) {
          .notices-header-inner { padding: 12px 14px; gap: 8px; }
          .notices-back span { display: none; }
          .notices-title { font-size: 1rem; }
        }
        .notices-content {
          flex: 1;
          max-width: 700px;
          margin: 0 auto;
          width: 100%;
          padding: 24px 24px 40px;
        }
        @media (max-width: 600px) {
          .notices-content { padding: 16px 12px 32px; }
        }
        .notices-loading {
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
        .notices-column {
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
        .title-accent.info { background: var(--green-light); }
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
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--glass-border);
          border-radius: 14px;
          text-align: center;
          color: var(--text-3);
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem;
        }
        .notice-card {
          background: var(--panel);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 20px;
          transition: transform 0.4s var(--ease-out), border-color 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .notice-card:hover {
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(255, 255, 255, 0.03), 0 6px 18px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
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
          font-size: 0.95rem;
          font-weight: 600;
          color: #f0f0f0;
          margin: 0 0 6px;
        }
        .notice-card-content {
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          color: var(--text-2);
          line-height: 1.55;
          margin: 0;
        }
      `}</style>
    </>
  );
}
