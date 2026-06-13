'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      title: 'Curriculum Archive',
      description: 'Quickly browse/search NISER SBS course syllabus resources, past year papers, lab documents, and notes organized by semester.',
    },
    {
      title: 'Smart Uploads',
      description: 'Directly upload files up to 500MB. Uploaded materials are automatically organized, duplicate-checked, and named with co-teaching professors\' last names.',
    },
    {
      title: 'Background Uploading',
      description: 'Do not close the window/tab while uploading. This will abort the upload',
    },
    {
      title: 'Request Materials',
      description: 'Can\'t find a specific slide deck or past year paper? Request it on the Requests board, or help peers by fulfilling their missing material requests.',
    },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationId: number;

    const scroll = () => {
      if (!isPaused) {
        container.scrollLeft += 0.8;
        if (container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused]);

  // Duplicate features list for seamless looping
  const duplicatedFeatures = [...features, ...features];

  return (
    <>
      <div className="features-wrapper">
        {/* Sticky Header */}
        <div className="features-header">
          <div className="features-header-inner">
            <a href="/" className="features-back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </a>
            <div className="features-header-info">
              <a href="/" className="navbar-wordmark">
                <span className="wordmark-bio">BIO</span>
                <span className="wordmark-archive">Archive</span>
              </a>
              <h1 className="features-title">Features Overview</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="features-content">
          <header className="features-hero">
            <h2>Get to know <span className="highlight">BioArchive</span></h2>
            <p>A community repository to access, share, and request School of Biological Sciences study resources.</p>
          </header>

          <div className="scroll-status-wrap">
            <button 
              className={`scroll-status-btn ${isPaused ? 'paused' : 'active'}`} 
              onClick={() => setIsPaused(p => !p)}
            >
              <span className="status-dot" />
              <span>{isPaused ? 'Auto-scroll Paused' : 'Auto-scrolling (Tap cards to pause)'}</span>
            </button>
          </div>

          <div 
            className="features-carousel"
            ref={containerRef}
            onClick={() => setIsPaused(p => !p)}
            onTouchStart={() => setIsPaused(p => !p)}
          >
            <div className="features-grid">
              {duplicatedFeatures.map((feat, index) => (
                <div key={index} className="feature-card">
                  <div className="card-header">
                    <h3>{feat.title}</h3>
                  </div>
                  <p>{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .features-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .features-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3, 10, 24, 0.88);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-bottom: 1px solid var(--glass-border);
        }
        .features-header-inner {
          max-width: 900px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .features-back {
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
        .features-back:hover { background: var(--glass-hover); color: var(--text); }
        .features-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .features-title {
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 600;
          color: var(--text);
          margin: 0;
          line-height: 1.1;
        }
        @media (max-width: 600px) {
          .features-header-inner { padding: 12px 14px; gap: 8px; }
          .features-back span { display: none; }
          .features-title { font-size: 1rem; }
        }
        .features-content {
          flex: 1;
          max-width: 900px;
          margin: 0 auto;
          width: 100%;
          padding: 40px 24px 60px;
        }
        @media (max-width: 600px) {
          .features-content { padding: 24px 12px 40px; }
        }
        .features-hero {
          text-align: center;
          margin-bottom: 40px;
        }
        .features-hero h2 {
          font-family: 'Cinzel', serif;
          font-size: 1.75rem;
          color: #fff;
          margin: 0 0 10px;
          font-weight: 700;
        }
        .features-hero h2 .highlight {
          color: var(--gold);
        }
        .features-hero p {
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          color: var(--text-2);
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.5;
        }
        .scroll-status-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .scroll-status-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          color: var(--text-2);
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .scroll-status-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .scroll-status-btn.active .status-dot {
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }
        .scroll-status-btn.paused .status-dot {
          background: #f59e0b;
          box-shadow: 0 0 8px #f59e0b;
        }
        .features-carousel {
          width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
          cursor: grab;
          padding: 10px 0;
        }
        .features-carousel:active {
          cursor: grabbing;
        }
        .features-carousel::-webkit-scrollbar {
          display: none;
        }
        .features-grid {
          display: flex;
          gap: 20px;
          width: max-content;
        }
        .feature-card {
          flex: 0 0 280px;
          background: var(--panel);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 24px;
          transition: transform 0.4s var(--ease-out), border-color 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.03);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .feature-card:hover {
          transform: translateY(-5px);
          border-color: rgba(0, 229, 255, 0.25);
          box-shadow: 0 16px 32px rgba(0, 229, 255, 0.06), 0 8px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        :global(.feat-icon) {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        .feature-card h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: #f0f0f0;
          margin: 0;
        }
        .feature-card p {
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem;
          color: var(--text-2);
          line-height: 1.6;
          margin: 0;
        }
      `}</style>
    </>
  );
}
