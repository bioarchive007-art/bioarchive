'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Course } from '@/data/curriculum';

interface CourseCardProps {
  course: Course;
  semester: string;
}

export default function CourseCard({ course, semester }: CourseCardProps) {
  const [imgError, setImgError] = useState(false);
  const initials = course.code.replace(/[^A-Z0-9]/g, '').slice(0, 2);

  return (
    <Link href={`/course/${encodeURIComponent(course.code)}?semester=${semester}`} passHref legacyBehavior>
      <motion.a
        className="course-card"
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
      <div className="cc-top">
        <div className="cc-icon-wrap">
          {!imgError ? (
            <img
              src={`/${course.image}`}
              alt={course.name}
              className="cc-icon-img"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="cc-icon-fallback">{initials}</span>
          )}
        </div>
        <div className="cc-info">
          <span className="cc-code">{course.code}</span>
          <h3 className="cc-name">{course.name}</h3>
          {course.description && (
            <p className="cc-desc">{course.description}</p>
          )}
        </div>
        <span className="cc-chevron">
          <ChevronRight size={18} />
        </span>
      </div>
      <div className="cc-accent-line" />

      <style jsx>{`
        .course-card {
          display: block;
          text-decoration: none;
          background: var(--panel);
          background-color: transparent;
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 16px;
          transition: transform 0.4s var(--ease-out), border-color 0.4s var(--ease-out), box-shadow 0.4s var(--ease-out), background-color 0.3s var(--ease-out);
          position: relative;
          overflow: hidden;
          transform-style: preserve-3d;
          perspective: 1000px;
          box-shadow: var(--glass-shadow);
        }
        .course-card:hover {
          background-color: rgba(255, 255, 255, 0.05);
          border-color: var(--glass-border-hover);
          box-shadow: var(--glass-shadow-hover);
          transform: translateY(-6px) rotateX(3deg) rotateY(-2deg) translateZ(8px);
        }
        .cc-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }
        .cc-icon-wrap {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .cc-icon-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 10px;
        }
        .cc-icon-fallback {
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--green-bright);
          letter-spacing: 0.04em;
        }
        .cc-info {
          flex: 1;
          min-width: 0;
        }
        .cc-code {
          font-family: 'Outfit', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          color: #daa520;
          letter-spacing: 0.06em;
        }
        .cc-name {
          font-family: 'Cinzel', serif;
          font-size: 1.05rem;
          font-weight: 700;
          color: #f0f0f0;
          margin: 2px 0 0;
          line-height: 1.25;
          letter-spacing: 0.02em;
        }
        .cc-desc {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.4);
          margin-top: 3px;
          line-height: 1.35;
        }
        .cc-chevron {
          color: rgba(255, 255, 255, 0.15);
          flex-shrink: 0;
          transition: color 0.2s, transform 0.2s;
          margin-top: 4px;
        }
        .course-card:hover .cc-chevron {
          color: var(--green-bright);
          transform: translateX(4px);
        }
        .cc-accent-line {
          position: absolute;
          bottom: 0;
          left: 16px;
          right: 16px;
          height: 1.5px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.25), transparent);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .course-card:hover .cc-accent-line {
          opacity: 1;
        }
      `}</style>
    </motion.a>
    </Link>
  );
}
