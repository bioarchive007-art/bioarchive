'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Upload, ChevronDown, Users, AlertTriangle,
} from 'lucide-react';
import { SheetRow } from '@/types';
import { CONFIG } from '@/config';
import { CURRICULUM } from '@/data/curriculum';
import { fetchFilesByCourse } from '@/lib/api-client';
import SortableFileTable from './SortableFileTable';
import UploadModal from './UploadModal';

interface CourseDetailProps {
  courseCode: string;
  semester?: string;
}

type SortField = 'fileName' | 'professor' | 'uploaderName' | 'year' | 'examType' | 'downloadCount';
type SortOrder = 'asc' | 'desc';

const FILE_TYPE_CONFIG: Record<
  string,
  { label: string; emoji: string; colorHex: string; badgeClass: string }
> = {
  qpaper: { label: 'Question Papers', emoji: '', colorHex: '#EF4444', badgeClass: 'badge-qpaper' },
  notes: { label: 'Notes', emoji: '', colorHex: '#3B82F6', badgeClass: 'badge-notes' },
  slides: { label: 'Slides', emoji: '', colorHex: '#8B5CF6', badgeClass: 'badge-slides' },
  lab: { label: 'Lab Materials', emoji: '', colorHex: '#10B981', badgeClass: 'badge-lab' },
  assignment: { label: 'Assignments', emoji: '', colorHex: '#F59E0B', badgeClass: 'badge-assignment' },
  other: { label: 'Other', emoji: '', colorHex: '#6B7280', badgeClass: 'badge-other' },
};

const FILE_TYPE_ORDER = ['qpaper', 'notes', 'slides', 'lab', 'assignment', 'other'];

export default function CourseDetail({ courseCode, semester }: CourseDetailProps) {
  const searchParams = useSearchParams();
  const activeSemester = semester || searchParams.get('semester') || '1';

  const [files, setFiles] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(FILE_TYPE_ORDER));
  const [sortStates, setSortStates] = useState<Record<string, { field: SortField; order: SortOrder }>>({});

  // Find the course from curriculum
  const course = useMemo(() => {
    const semCourses = CURRICULUM[activeSemester] || [];
    return semCourses.find((c) => c.code === courseCode);
  }, [courseCode, activeSemester]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetchFilesByCourse(courseCode, activeSemester)
      .then((data) => { if (!cancelled) setFiles(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseCode, activeSemester]);

  // Group files by type
  const filesByType = useMemo(() => {
    const groups: Record<string, SheetRow[]> = {};
    for (const type of FILE_TYPE_ORDER) {
      groups[type] = [];
    }
    for (const file of files) {
      const key = file.fileType.toLowerCase();
      if (groups[key]) groups[key].push(file);
      else groups['other'].push(file);
    }
    return groups;
  }, [files]);

  // Sort files within each group
  const sortedFilesByType = useMemo(() => {
    const result: Record<string, SheetRow[]> = {};
    for (const [type, typeFiles] of Object.entries(filesByType)) {
      const sort = sortStates[type] || { field: 'year' as SortField, order: 'desc' as SortOrder };
      const sorted = [...typeFiles].sort((a, b) => {
        let valA: any = a[sort.field];
        let valB: any = b[sort.field];
        if (sort.field === 'downloadCount') {
          valA = Number(valA) || 0;
          valB = Number(valB) || 0;
        } else {
          valA = String(valA || '').toLowerCase();
          valB = String(valB || '').toLowerCase();
        }
        if (valA < valB) return sort.order === 'asc' ? -1 : 1;
        if (valA > valB) return sort.order === 'asc' ? 1 : -1;
        return 0;
      });
      result[type] = sorted;
    }
    return result;
  }, [filesByType, sortStates]);

  const toggleType = useCallback((type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleSort = useCallback((type: string, field: SortField) => {
    setSortStates((prev) => {
      const current = prev[type] || { field: 'year', order: 'desc' };
      const newOrder = current.field === field && current.order === 'desc' ? 'asc' : 'desc';
      return { ...prev, [type]: { field, order: newOrder } };
    });
  }, []);

  const totalFiles = files.length;
  const hasAnyFiles = totalFiles > 0;

  return (
    <>
      <div className="cd-wrapper">
        {/* Sticky Header */}
        <div className="cd-header">
          <div className="cd-header-inner">
            <a href="/" className="cd-back">
              <ArrowLeft size={18} />
              <span>Back</span>
            </a>
            <div className="cd-header-info">
              <span className="cd-code">{courseCode}</span>
              <h1 className="cd-title">{course?.name || courseCode}</h1>
              {course && course.professors.length > 0 && (
                <div className="cd-profs">
                  <Users size={13} />
                  <span>{course.professors.filter((p) => p !== 'Other').join(' · ')}</span>
                </div>
              )}
            </div>
            <div className="cd-header-right">
              <span className="cd-file-count">{totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
              <button className="btn-gold cd-upload-btn" onClick={() => setUploadOpen(true)}>
                <Upload size={15} /> Upload
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <motion.div
          className="cd-content"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08
              }
            }
          }}
          initial="hidden"
          animate="show"
        >
          {/* Loading */}
          {loading && (
            <div className="cd-skeletons">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="cd-sk-block">
                  <div className="skeleton cd-sk-header" />
                  <div className="skeleton cd-sk-table" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="cd-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && !hasAnyFiles && (
            <motion.div
              className="cd-empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <BookOpen size={48} strokeWidth={1} />
              <h3>No files uploaded yet</h3>
              <p>Be the first to share materials for {course?.name || courseCode}.</p>
              <button className="btn-gold" onClick={() => setUploadOpen(true)}>
                <Upload size={15} /> Upload Now
              </button>
            </motion.div>
          )}

          {/* Reference Books Section */}
          {!loading && !error && course?.textbooks && course.textbooks.length > 0 && (
            <motion.section
              className="cd-type-section"
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0 }
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ marginBottom: '20px' }}
            >
              <div className="cd-books-header">
                <span className="cd-books-accent" />
                <BookOpen size={16} style={{ marginRight: 4 }} />
                <span className="cd-type-label">Recommended Reference Books</span>
              </div>
              <div className="cd-books-body">
                {course.textbooks.map((book) => (
                  <div key={book} className="cd-book-row">
                    <span className="cd-book-name">{book}</span>
                    <div className="cd-book-actions">
                      <a
                        href={`https://books.google.com/books?q=${encodeURIComponent(book)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="cd-book-btn google"
                      >
                        Google Books
                      </a>
                      <a
                        href={`https://openlibrary.org/search?q=${encodeURIComponent(book)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="cd-book-btn openlib"
                      >
                        Open Library
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* File type sections */}
          {!loading && !error && hasAnyFiles && (
            <div className="cd-sections">
              {FILE_TYPE_ORDER.map((type) => {
                const typeFiles = sortedFilesByType[type] || [];
                if (typeFiles.length === 0) return null;
                const config = FILE_TYPE_CONFIG[type];
                const isExpanded = expandedTypes.has(type);
                const sort = sortStates[type] || { field: 'year' as SortField, order: 'desc' as SortOrder };

                return (
                  <motion.section
                    key={type}
                    className="cd-type-section"
                    variants={{
                      hidden: { opacity: 0, y: 14 },
                      show: { opacity: 1, y: 0 }
                    }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <button
                      className="cd-type-header"
                      onClick={() => toggleType(type)}
                    >
                      <span
                        className="cd-type-accent"
                        style={{ background: config.colorHex }}
                      />

                      <span className="cd-type-label">{config.label}</span>
                      <span className="cd-type-count">{typeFiles.length}</span>
                      <motion.span
                        className="cd-type-chevron"
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown size={18} />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="cd-type-body"
                        >
                          <div className="cd-type-table-wrap">
                            <SortableFileTable
                              files={typeFiles}
                              fileType={type}
                              sortField={sort.field}
                              sortOrder={sort.order}
                              onSort={(field) => handleSort(type, field)}
                              accentColor={config.colorHex}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />

      <style jsx>{`
        .cd-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .cd-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(3, 10, 24, 0.97);
          border-bottom: 1px solid var(--glass-border);
        }
        .cd-header-inner {
          max-width: 1000px;
          margin: 0 auto;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .cd-back {
          display: flex;
          align-items: center;
          gap: 5px;
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.82rem;
          color: var(--text-2);
          padding: 6px 10px;
          border-radius: 8px;
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .cd-back:hover { background: var(--glass-hover); color: var(--text); }
        .cd-header-info {
          flex: 1;
          min-width: 0;
        }
        .cd-code {
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.68rem;
          font-weight: 600;
          color: var(--gold);
          letter-spacing: 0.06em;
        }
        .cd-title {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text);
          margin: 2px 0 0;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cd-profs {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-top: 3px;
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.72rem;
          color: var(--text-3);
        }
        .cd-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .cd-file-count {
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.72rem;
          color: var(--text-3);
        }
        @media (max-width: 600px) {
          .cd-header-inner { padding: 12px 14px; gap: 10px; }
          .cd-title { font-size: 1.1rem; }
          .cd-file-count { display: none; }
          .cd-upload-btn span { display: none; }
          .cd-back span { display: none; }
        }
        .cd-content {
          flex: 1;
          max-width: 1000px;
          margin: 0 auto;
          width: 100%;
          padding: 20px 24px 40px;
        }
        @media (max-width: 600px) {
          .cd-content { padding: 14px 12px 32px; }
        }
        .cd-skeletons {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cd-sk-block {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cd-sk-header { height: 48px; width: 100%; }
        .cd-sk-table { height: 120px; width: 100%; }
        .cd-error {
          text-align: center;
          padding: 40px;
          color: #f87171;
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.9rem;
        }

        .cd-sections {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cd-type-section {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid var(--glass-border);
        }
        .cd-type-header {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          background: var(--glass);
          border: none;
          cursor: pointer;
          transition: background 0.15s;
          color: var(--text);
          position: relative;
        }
        .cd-type-header:hover { background: var(--glass-hover); }
        .cd-type-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .cd-type-emoji { font-size: 1rem; flex-shrink: 0; }
        .cd-type-label {
          flex: 1;
          text-align: left;
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .cd-type-count {
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.72rem;
          color: var(--text-3);
          background: var(--glass);
          padding: 2px 8px;
          border-radius: 10px;
        }
        .cd-type-chevron {
          display: flex;
          color: var(--text-3);
        }
        .cd-type-body {
          overflow: hidden;
        }
        .cd-type-table-wrap {
          padding: 8px 8px 12px;
        }
        .cd-books-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-bottom: 1px solid var(--glass-border);
        }
        .cd-books-accent {
          width: 4px;
          height: 22px;
          border-radius: 2px;
          background: var(--gold);
          flex-shrink: 0;
        }
        .cd-books-body {
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cd-book-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }
        .cd-book-row:last-child {
          border-bottom: none;
        }
        .cd-book-name {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.84rem;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.4;
        }
        .cd-book-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .cd-book-btn {
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
          transition: all 0.15s;
          cursor: pointer;
          text-decoration: none;
        }
        .cd-book-btn.google {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: var(--text-2);
        }
        .cd-book-btn.google:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text);
        }
        .cd-book-btn.openlib {
          background: rgba(212, 168, 83, 0.12);
          border: 1px solid rgba(212, 168, 83, 0.25);
          color: var(--gold);
        }
        .cd-book-btn.openlib:hover {
          background: rgba(212, 168, 83, 0.2);
          color: #fff;
          box-shadow: 0 0 8px rgba(212, 168, 83, 0.2);
        }
        @media (max-width: 600px) {
          .cd-book-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .cd-book-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </>
  );
}
