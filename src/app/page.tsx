'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { CONFIG } from '@/config';
import { CURRICULUM } from '@/data/curriculum';
import Navbar from '@/components/Navbar';
import SemesterBlock from '@/components/SemesterBlock';
import UploadModal from '@/components/UploadModal';
import GlobalSearch from '@/components/GlobalSearch';

const ALL_SEMESTERS = [...CONFIG.NISER_SEMESTERS.map(String), 'ADVANCE COURSES'];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expandedSemester, setExpandedSemester] = useState('1');
  const [activeCourse, setActiveCourse] = useState('');

  const semRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 180], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 180], [1, 0.94]);
  const heroY = useTransform(scrollY, [0, 180], [0, -25]);

  useEffect(() => {
    setMounted(true);
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
            <motion.div
              style={{
                opacity: heroOpacity,
                scale: heroScale,
                y: heroY,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <motion.h1
                className="hero-heading"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
              >
                BIO <em className="hero-archive">Archive</em>
              </motion.h1>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="hero-search-wrap"
              >
                <GlobalSearch />
              </motion.div>
            </motion.div>
          </section>

          {/* Semester blocks */}
          <section className="semesters-section">
            {ALL_SEMESTERS.map((sem, idx) => {
              const courses = CURRICULUM[sem];
              if (!courses || courses.length === 0) return null;

              return (
                <motion.div
                  key={sem}
                  ref={(el) => { semRefs.current[sem] = el; }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + idx * 0.06, duration: 0.4 }}
                >
                  <SemesterBlock
                    semesterNumber={sem}
                    courses={courses}
                    isExpanded={expandedSemester === sem}
                    activeCourse={activeCourse}
                    onToggle={() => handleToggleSemester(sem)}
                    onCourseActivate={(code) => handleCourseSelect(code, sem)}
                  />
                </motion.div>
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
          background: radial-gradient(circle, rgba(2, 132, 199, 0.04) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
        }
        .hero-label {
          display: block;
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          font-weight: 500;
          color: var(--text-3);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          margin-bottom: 16px;
          position: relative;
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
          background: linear-gradient(135deg, var(--green-light) 0%, var(--green-bright) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-style: italic;
        }
        .hero-search-wrap {
          margin-top: 28px;
          width: 100%;
          max-width: 560px;
          display: flex;
          justify-content: center;
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
