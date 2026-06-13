'use client';

import React from 'react';
import { ArrowLeft, Info, FileCheck, ShieldAlert } from 'lucide-react';

export default function AboutPage() {
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
                <span className="wordmark-bio">Bio</span>
                <span className="wordmark-archive">Archive</span>
              </a>
              <h1 className="about-title">About</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="about-content">
          <div className="info-column">
            {/* Card 1: What is BioArchive */}
            <section className="info-card">
              <div className="info-card-header">
                {/* <Info size={18} className="info-icon" /> */}
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
                {/* <FileCheck size={18} className="info-icon check" /> */}
                <h3>Upload Guidelines</h3>
              </div>
              <p>To keep the archive clean and reliable, please adhere to these rules when sharing files:</p>
              <ul className="guidelines-list">
                <li><strong>Standard Formats:</strong> Upload documents as PDFs, Slides as PPTX or PPT, and Images as JPG, JPEG, or PNG.</li>
                <li><strong>Correct Metadata:</strong> Make sure to select the correct course, semester, year, and professor co-teaching the module.</li>
                <li><strong>Legibility:</strong> If scanning physically written papers or laboratory notebooks, ensure the image is bright and easily readable.</li>
                <li><strong>No Spam:</strong> Avoid uploading duplicate files. Our system checks hashes and metadata duplicates to keep the registry database lean.</li>
              </ul>
            </section>

            {/* Card 3: Notice & Disclaimer */}
            <section className="info-card disclaimer">
              <div className="info-card-header">
                {/* <ShieldAlert size={18} className="info-icon alert" /> */}
                <h3>Academic Integrity</h3>
              </div>
              <p>
                All files shared on BioArchive are uploaded voluntarily by students for reference purposes only. BioArchive does not promote plagiarism, academic dishonesty, or policy violations. Instructors and maintainers reserve the right to request deletion of materials at any time.
              </p>
            </section>
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
          max-width: 760px;
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
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
          padding: 24px 24px 40px;
        }
        @media (max-width: 600px) {
          .about-content { padding: 16px 12px 32px; }
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
      `}</style>
    </>
  );
}
