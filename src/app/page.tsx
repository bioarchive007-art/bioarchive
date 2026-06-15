'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CONFIG } from '@/config';
import { CURRICULUM } from '@/data/curriculum';
import Navbar from '@/components/Navbar';
import SemesterBlock from '@/components/SemesterBlock';
import GlobalSearch from '@/components/GlobalSearch';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { ChevronDown } from 'lucide-react';

const UploadModal = dynamic(() => import('@/components/UploadModal'), {
  ssr: false,
});

const Hero3D = dynamic(() => import('@/components/Hero3D'), {
  ssr: false,
});



const ALL_SEMESTERS = [...CONFIG.NISER_SEMESTERS.map(String), 'ADVANCE COURSES'];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expandedSemester, setExpandedSemester] = useState('');
  const [activeCourse, setActiveCourse] = useState('');

  const semRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setMounted(true);
    AOS.init({
      duration: 1000,
      easing: 'ease-out-cubic',
      once: false,
      offset: 120,
    });
  }, []);

  const scrollToSemester = useCallback((sem: string) => {
    const el = semRefs.current[sem];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleCourseSelect = useCallback((courseCode: string, sem: string) => {
    setActiveCourse(courseCode);
    setExpandedSemester(sem);
    setTimeout(() => scrollToSemester(sem), 100);
  }, [scrollToSemester]);

  const handleToggleSemester = useCallback((sem: string) => {
    setExpandedSemester((prev) => (prev === sem ? '' : sem));
  }, []);

  return (
    <>
      <Navbar onUploadClick={() => setUploadOpen(true)} />

      {/* Dynamic Background DNA Helix for Homepage Only */}
      <div className="global-3d-bg" aria-hidden="true">
        <Hero3D />
      </div>

      <div className="app-layout">
        <main className="main-content">
          {/* Hero */}
          <section className="hero">
            <div className="hero-animate-wrap">
              <h1 className="hero-heading hero-fade-in">
                BIO<em className="hero-archive">Archive</em>
              </h1>
              {/* <p className="hero-description hero-fade-in hero-fade-in-delay">
              </p> */}
              <div className="hero-search-wrap hero-fade-in hero-fade-in-delay">
                <GlobalSearch />
              </div>
            </div>

            {/* Pulsing Scroll down indicator */}
            <div className="scroll-indicator-wrap">
              <div
                className="scroll-indicator hero-fade-in hero-fade-in-delay"
                onClick={() => {
                  const el = document.querySelector('.semesters-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
              >
                <span className="scroll-text">Scroll Down</span>
                <div className="scroll-arrow">
                  <ChevronDown size={13} strokeWidth={1.5} />
                </div>
              </div>
            </div>
          </section>

          {/* Semester blocks */}
          <section className="semesters-section">
            {ALL_SEMESTERS.map((sem, idx) => {
              const courses = CURRICULUM[sem];
              if (!courses || courses.length === 0) return null;

              return (
                <div
                  key={sem}
                  ref={(el) => { semRefs.current[sem] = el; }}
                  data-aos="fade-right"
                  data-aos-delay={idx * 50}
                >
                  <SemesterBlock
                    semesterNumber={sem}
                    courses={courses}
                    isExpanded={expandedSemester === sem}
                    activeCourse={activeCourse}
                    onToggle={() => handleToggleSemester(sem)}
                    onCourseActivate={(code) => handleCourseSelect(code, sem)}
                  />
                </div>
              );
            })}
          </section>
        </main>
      </div>

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />

      <style jsx>{`
        .hero {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 20px 100px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          min-height: calc(100vh - var(--nav-h));
          overflow: hidden;
        }
        .scroll-indicator-wrap {
          position: absolute;
          bottom: 24px;
          left: 0;
          width: 100%;
          display: flex;
          justify-content: center;
          pointer-events: none;
          z-index: 10;
        }
        .scroll-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          color: var(--text-3);
          font-family: var(--font-outfit), 'Outfit', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: color 0.3s;
          pointer-events: auto;
        }
        .scroll-indicator:hover {
          color: var(--green-light);
        }
        .scroll-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          background: var(--glass);
          transition: all 0.3s;
          animation: scrollBounce 2s infinite;
        }
        .scroll-indicator:hover .scroll-arrow {
          border-color: rgba(255, 255, 255, 0.25);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        }
        @keyframes scrollBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
          60% { transform: translateY(-3px); }
        }
        .hero-animate-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .hero-heading {
          font-family: var(--font-cinzel), 'Cinzel', serif;
          font-size: clamp(3.6rem, 9vw, 5.8rem);
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.03em;
          line-height: 1.05;
          position: relative;
          margin: 0 0 16px;
        }
        .hero-archive {
          font-family: var(--font-tangerine), 'Tangerine', cursive;
          font-size: 1.45em;
          font-weight: 700;
          color: #10b981;
          font-style: normal;
          text-shadow: 0 0 15px rgba(16, 185, 129, 0.25);
          background: none;
          -webkit-background-clip: initial;
          -webkit-text-fill-color: initial;
          margin-left: 8px;
          display: inline-block;
          vertical-align: middle;
        }
        .hero-description {
          font-family: var(--font-plus-jakarta-sans), 'Plus Jakarta Sans', sans-serif;
          font-size: 0.95rem;
          line-height: 1.6;
          color: var(--text-2);
          margin-bottom: 24px;
          max-width: 520px;
        }
        .hero-search-wrap {
          width: 100%;
          max-width: 480px;
          display: flex;
          justify-content: center;
        }
        .hero-fade-in {
          animation: heroFadeIn 0.6s ease-out both;
        }
        .hero-fade-in-delay {
          animation-delay: 0.2s;
        }

        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .semesters-section {
          padding: 8px 20px 60px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (max-width: 768px) {
          .hero {
            grid-template-columns: 1fr;
            text-align: center;
            padding: 60px 16px 100px;
            gap: 20px;
            min-height: calc(100vh - var(--nav-h));
            position: relative;
            overflow: visible;
          }
          .hero-animate-wrap {
            align-items: center !important;
            text-align: center !important;
            position: relative;
            z-index: 5;
          }
          .hero-description {
            text-align: center;
            margin-bottom: 16px;
          }
          .hero-search-wrap {
            justify-content: center !important;
          }

          .semesters-section { padding: 8px 12px 40px; }
        }
      `}</style>
    </>
  );
}
