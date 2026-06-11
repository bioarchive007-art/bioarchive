'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Course } from '@/data/curriculum';
import CourseCard from './CourseCard';

interface SemesterBlockProps {
  semesterNumber: string;
  label?: string;
  courses: Course[];
  isExpanded: boolean;
  activeCourse: string;
  onToggle: () => void;
  onCourseActivate: (courseCode: string) => void;
}

export default function SemesterBlock({
  semesterNumber,
  label,
  courses,
  isExpanded,
  activeCourse,
  onToggle,
  onCourseActivate,
}: SemesterBlockProps) {
  const badge = semesterNumber === 'ADVANCE COURSES'
    ? 'ADV'
    : `S${semesterNumber.padStart(2, '0')}`;
  const title = label || (semesterNumber === 'ADVANCE COURSES'
    ? 'Advanced Courses'
    : `Semester ${semesterNumber}`);

  return (
    <section className="sem-block">
      <button className="sem-block-header" onClick={onToggle}>
        <span className="sem-block-badge">{badge}</span>
        <h2 className="sem-block-title">{title}</h2>
        <span className="sem-block-count">{courses.length} course{courses.length !== 1 ? 's' : ''}</span>
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.25 }}
          className="sem-block-chevron"
        >
          <ChevronDown size={20} strokeWidth={1.5} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="sem-block-body"
          >
            <div className="sem-block-grid">
              {courses.map((course, idx) => (
                <motion.div
                  key={course.code}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                >
                  <CourseCard course={course} semester={semesterNumber} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .sem-block {
          margin-bottom: 8px;
        }
        .sem-block-header {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 18px;
          background: var(--panel);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          cursor: pointer;
          transition: transform 0.3s var(--ease-out), background 0.3s, border-color 0.3s, box-shadow 0.3s;
          color: var(--text);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        .sem-block-header:hover {
          background: var(--glass-hover);
          border-color: rgba(0, 229, 255, 0.25);
          transform: translateY(-3px) scale(1.002);
          box-shadow: 0 12px 30px rgba(0, 229, 255, 0.05), 0 6px 18px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        .sem-block-badge {
          font-family: 'Outfit', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--green-bright);
          background: rgba(0, 229, 255, 0.12);
          padding: 4px 10px;
          border-radius: 6px;
          letter-spacing: 0.06em;
          border: 1px solid rgba(0, 229, 255, 0.2);
        }
        .sem-block-title {
          flex: 1;
          text-align: left;
          font-family: 'Cinzel', serif;
          font-size: 1.15rem;
          font-weight: 700;
          color: #f0f0f0;
          margin: 0;
          letter-spacing: 0.03em;
        }
        .sem-block-count {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.35);
          font-weight: 500;
        }
        .sem-block-chevron {
          display: flex;
          color: rgba(255, 255, 255, 0.3);
        }
        .sem-block-body {
          overflow: hidden;
        }
        .sem-block-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
          padding: 12px 4px 4px;
        }
      `}</style>
    </section>
  );
}
