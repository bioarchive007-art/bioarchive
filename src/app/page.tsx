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

const UploadModal = dynamic(() => import('@/components/UploadModal'), {
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

  if (!mounted) return null;

  return (
    <>
      <Navbar onUploadClick={() => setUploadOpen(true)} />

      <div className="app-layout">
        <main className="main-content">
          {/* Hero */}
          <section className="hero">
            <div className="hero-glow" aria-hidden="true" />
            <div className="hero-animate-wrap">
              <h1 className="hero-heading hero-fade-in">
                BIO<em className="hero-archive">Archive</em>
              </h1>

              <div className="hero-search-wrap hero-fade-in hero-fade-in-delay">
                <GlobalSearch />
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
          text-align: center;
          padding: 80px 20px 48px;
          max-width: 1100px;
          margin: 0 auto;
          width: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .hero-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 500px;
          height: 500px;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, rgba(2, 132, 199, 0.08) 0%, rgba(2, 132, 199, 0.03) 40%, transparent 70%);
          pointer-events: none;
        }
        .hero-animate-wrap {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .hero-heading {
          font-family: 'Cormorant Garamond', serif;
          font-size: clamp(3.6rem, 9vw, 5.8rem);
          font-weight: 700;
          color: var(--text);
          letter-spacing: -0.03em;
          line-height: 1.05;
          position: relative;
          margin: 0 0 16px;
        }
        .hero-archive {
          font-family: 'Tangerine', cursive;
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
        .hero-search-wrap {
          margin-top: 28px;
          width: 100%;
          max-width: 560px;
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
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        @media (max-width: 768px) {
          .hero { padding: 60px 16px 36px; }
          .semesters-section { padding: 8px 12px 40px; }
        }
      `}</style>
    </>
  );
}
