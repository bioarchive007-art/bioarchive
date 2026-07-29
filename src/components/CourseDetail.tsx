'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BookOpen, Upload, ChevronDown, Users, AlertTriangle, Lock, Download, Loader2,
} from 'lucide-react';
import { SheetRow } from '@/types';
import { CONFIG } from '@/config';
import { CURRICULUM } from '@/data/curriculum';
import { fetchFilesByCourse } from '@/lib/api-client';
import { normalizeCourseCode, getProfessorAcronym } from '@/lib/utils';
import SortableFileTable from './SortableFileTable';
import UploadModal from './UploadModal';
import { useAuth } from './AuthProvider';

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
  const { siteConfig, user, idToken, triggerLogin } = useAuth();

  const [files, setFiles] = useState<SheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedAuthors, setExpandedAuthors] = useState<Record<string, boolean>>({});
  const [sortStates, setSortStates] = useState<Record<string, { field: SortField; order: SortOrder }>>({});

  const toggleAuthor = useCallback((author: string) => {
    setExpandedAuthors((prev) => ({
      ...prev,
      [author]: prev[author] !== undefined ? !prev[author] : false,
    }));
  }, []);

  // Books state
  const [booksExpanded, setBooksExpanded] = useState(false);
  const [books, setBooks] = useState<Array<{ id: string; name: string; webViewLink?: string; mimeType?: string }>>([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState('');
  const [booksFetched, setBooksFetched] = useState(false);

  // Determine if user has access to books
  const isNiserOrPrivileged = !!user && (
    user.email.toLowerCase().endsWith('@niser.ac.in') ||
    user.email.toLowerCase() === 'bioarchive007@gmail.com' ||
    user.email.toLowerCase().startsWith('bioarchive007@') ||
    user.isAdmin === true
  );

  // Find the course from curriculum
  const course = useMemo(() => {
    const semCourses = CURRICULUM[activeSemester] || [];
    const { oldCode: queryOld } = normalizeCourseCode(courseCode);
    return semCourses.find((c) => {
      const { oldCode: courseOld } = normalizeCourseCode(c.code);
      return courseOld === queryOld;
    });
  }, [courseCode, activeSemester]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    fetchFilesByCourse(courseCode, activeSemester)
      .then((filesData) => { if (!cancelled) setFiles(filesData); })
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

  // Group notes files by author (uploaderName)
  const notesByAuthor = useMemo(() => {
    const notesFiles = sortedFilesByType['notes'] || [];
    const groups: Record<string, SheetRow[]> = {};

    for (const file of notesFiles) {
      const raw = (file.uploaderName || '').trim();
      let authorName = raw;
      if (!raw || raw.toLowerCase() === 'anonymous' || raw.toLowerCase() === 'unknown') {
        authorName = 'Unknown';
      }
      if (!groups[authorName]) {
        groups[authorName] = [];
      }
      groups[authorName].push(file);
    }

    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });

    return keys.map((key) => ({
      author: key,
      files: groups[key],
    }));
  }, [sortedFilesByType]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem('bioarchive:sorts');
    if (cached) {
      try {
        setSortStates(JSON.parse(cached));
      } catch (e) {
        console.error('Failed to parse cached sorts');
      }
    }
  }, []);

  const handleSort = useCallback((type: string, field: SortField) => {
    setSortStates((prev) => {
      const current = prev[type] || { field: 'year', order: 'desc' };
      const newOrder: SortOrder = current.field === field && current.order === 'desc' ? 'asc' : 'desc';
      const newState = { ...prev, [type]: { field, order: newOrder } };
      localStorage.setItem('bioarchive:sorts', JSON.stringify(newState));
      return newState;
    });
  }, []);


  const totalFiles = files.length;
  const hasAnyFiles = totalFiles > 0;

  if (loading) {
    return (
      <div className="dna-loader-wrap fullscreen">
        <div className="dna-loader-card">
          <div className="dna-helix">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="dna-rung" style={{ '--i': i } as React.CSSProperties}>
                <div className="dna-dot dot-1" />
                <div className="dna-rung-bar" />
                <div className="dna-dot dot-2" />
              </div>
            ))}
          </div>
          <div className="dna-loader-text">Loading Materials</div>
        </div>
        <style jsx>{`
          .dna-loader-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px 20px;
            width: 100%;
          }
          .dna-loader-wrap.fullscreen {
            min-height: calc(100vh - var(--nav-h));
          }
          .dna-loader-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px 48px;
            background: var(--glass);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            backdrop-filter: var(--glass-blur);
            -webkit-backdrop-filter: var(--glass-blur);
            box-shadow: var(--glass-shadow);
            max-width: 380px;
            width: 100%;
            text-align: center;
          }
          .dna-helix {
            display: flex;
            gap: 7px;
            height: 60px;
            align-items: center;
            justify-content: center;
            perspective: 600px;
            width: 100%;
          }
          .dna-rung {
            position: relative;
            width: 3px;
            height: 52px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            transform-style: preserve-3d;
            animation: dnaRotate 1.8s infinite linear;
            animation-delay: calc(var(--i) * -0.15s);
          }
          .dna-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
          }
          .dot-1 {
            background: var(--text-2);
          }
          .dot-2 {
            background: rgba(255, 255, 255, 0.3);
          }
          .dna-rung-bar {
            width: 1px;
            flex: 1;
            background: rgba(255, 255, 255, 0.12);
            margin: 2px 0;
          }
          .dna-loader-text {
            margin-top: 20px;
            font-family: 'Outfit', sans-serif;
            font-size: 0.76rem;
            color: var(--text-2);
            letter-spacing: 0.14em;
            text-transform: uppercase;
            font-weight: 700;
            animation: textPulse 1.6s infinite ease-in-out;
          }
          @keyframes dnaRotate {
            0% {
              transform: rotateX(0deg);
            }
            100% {
              transform: rotateX(360deg);
            }
          }
          @keyframes textPulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <div className="cd-wrapper">
        {/* Sticky Header */}
        <div className="cd-header">
          <div className="cd-header-inner">
            <Link href="/" className="cd-back">
              <ArrowLeft size={18} strokeWidth={1.5} />
              <span>Back</span>
            </Link>
            <div className="cd-header-info">
              <span className="cd-code">{normalizeCourseCode(courseCode).canonical}</span>
              <h1 className="cd-title">{course?.name || normalizeCourseCode(courseCode).canonical}</h1>
              {course && course.professors.length > 0 && (
                <div className="cd-profs" title={course.professors.filter((p) => p !== 'Other').join(' · ')}>
                  <Users size={13} strokeWidth={1.5} />
                  <span>
                    {course.professors
                      .filter((p) => p !== 'Other')
                      .map((p) => getProfessorAcronym(p))
                      .join(' · ')}
                  </span>
                </div>
              )}
            </div>
            <div className="cd-header-right">
              <span className="cd-file-count">{totalFiles} file{totalFiles !== 1 ? 's' : ''}</span>
              <button className="btn-gold cd-upload-btn" onClick={() => setUploadOpen(true)}>
                <Upload size={15} strokeWidth={1.5} /> Upload
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

          {/* File type sections */}
          {!loading && !error && hasAnyFiles && (
            <div className="cd-sections">
              {FILE_TYPE_ORDER.map((type) => {
                const typeFiles = sortedFilesByType[type] || [];
                if (typeFiles.length === 0) return null;
                const config = FILE_TYPE_CONFIG[type];
                const isExpanded = expandedSection === type;
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
                      onClick={() => toggleSection(type)}
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
                        <ChevronDown size={18} strokeWidth={1.5} />
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
                          {type === 'notes' ? (
                            <div className="cd-authors-wrap">
                              {notesByAuthor.map(({ author, files: authorFiles }) => {
                                const isAuthorOpen = expandedAuthors[author] !== false;
                                return (
                                  <div key={author} className="cd-author-group">
                                    <button
                                      className="cd-author-header"
                                      onClick={() => toggleAuthor(author)}
                                    >
                                      <div className="cd-author-title">
                                        <Users size={14} style={{ color: config.colorHex }} />
                                        <span>{author === 'Unknown' ? 'Unknown' : author}</span>
                                      </div>
                                      <div className="cd-author-meta">
                                        <span className="cd-author-count">
                                          {authorFiles.length} file{authorFiles.length !== 1 ? 's' : ''}
                                        </span>
                                        <motion.span
                                          animate={{ rotate: isAuthorOpen ? 180 : 0 }}
                                          transition={{ duration: 0.2 }}
                                          style={{ display: 'flex' }}
                                        >
                                          <ChevronDown size={15} strokeWidth={1.5} />
                                        </motion.span>
                                      </div>
                                    </button>
                                    <AnimatePresence initial={false}>
                                      {isAuthorOpen && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                                          className="cd-author-body"
                                        >
                                          <div className="cd-type-table-wrap">
                                            <SortableFileTable
                                              files={authorFiles}
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
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
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
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.section>
                );
              })}
            </div>
          )}

          {/* Reference Books Section */}
          {siteConfig?.enableReferenceBooks !== false && (
            <motion.section
              className="cd-type-section"
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <button
                className="cd-type-header"
                onClick={async () => {
                  const newExpanded = !booksExpanded;
                  setBooksExpanded(newExpanded);
                  if (newExpanded && !booksFetched && isNiserOrPrivileged && idToken) {
                    setBooksLoading(true);
                    setBooksError('');
                    try {
                      const params = new URLSearchParams({ semester: activeSemester, courseCode });
                      if (idToken) params.set('token', idToken);
                      const res = await fetch(`/api/books?${params.toString()}`);
                      if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        throw new Error(errData.error || 'Failed to load books');
                      }
                      const data = await res.json();
                      setBooks(Array.isArray(data) ? data : []);
                    } catch (err: any) {
                      setBooksError(err.message || 'Could not load books');
                    } finally {
                      setBooksLoading(false);
                      setBooksFetched(true);
                    }
                  }
                }}
              >
                <span className="cd-type-accent" style={{ background: 'var(--gold)' }} />
                <span className="cd-type-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BookOpen size={14} strokeWidth={1.5} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                  Reference Books
                </span>
                {!isNiserOrPrivileged && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginRight: '4px', fontFamily: "'Outfit', sans-serif" }}>
                    <Lock size={11} strokeWidth={1.5} /> NISER only
                  </span>
                )}
                <motion.span
                  className="cd-type-chevron"
                  animate={{ rotate: booksExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown size={18} strokeWidth={1.5} />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {booksExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="cd-type-body"
                  >
                    <div style={{ padding: '12px 16px' }}>
                      {/* Auth gate */}
                      {!user && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <Lock size={28} strokeWidth={1} style={{ opacity: 0.3, marginBottom: '10px' }} />
                          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.84rem', color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
                            Sign in with your NISER Google account to access reference books.
                          </p>
                          <button
                            className="btn-gold"
                            style={{ fontSize: '0.78rem' }}
                            onClick={(e) => { e.stopPropagation(); triggerLogin(); }}
                          >
                            Sign In
                          </button>
                        </div>
                      )}

                      {/* Wrong account */}
                      {user && !isNiserOrPrivileged && (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                          <Lock size={28} strokeWidth={1} style={{ color: '#f87171', opacity: 0.6, marginBottom: '10px' }} />
                          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.84rem', color: '#f87171', marginBottom: '6px' }}>
                            NISER Account Required
                          </p>
                          <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                            Only <code style={{ color: 'var(--gold)' }}>@niser.ac.in</code> accounts can view reference books.
                          </p>
                        </div>
                      )}

                      {/* Authorized: loading */}
                      {isNiserOrPrivileged && booksLoading && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px 0', color: 'rgba(255,255,255,0.4)', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem' }}>
                          <Loader2 size={18} className="cd-spin" /> Loading books...
                        </div>
                      )}

                      {/* Authorized: error */}
                      {isNiserOrPrivileged && !booksLoading && booksError && (
                        <div style={{ color: '#f87171', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', textAlign: 'center', padding: '12px 0' }}>
                          {booksError}
                        </div>
                      )}

                      {/* Authorized: empty */}
                      {isNiserOrPrivileged && !booksLoading && !booksError && booksFetched && books.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '20px 0', fontFamily: "'Outfit', sans-serif", fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)' }}>
                          No reference books available for this course yet.
                        </div>
                      )}

                      {/* Authorized: files list */}
                      {isNiserOrPrivileged && !booksLoading && !booksError && books.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                          {books.map((book) => (
                            <div key={book.id} className="cd-book-row">
                              <span className="cd-book-name">{book.name.replace(/\.pdf$/i, '')}</span>
                              <div className="cd-book-actions">
                                <a
                                  href={`/api/books/download?fileId=${book.id}&bookName=${encodeURIComponent(book.name)}&courseCode=${encodeURIComponent(courseCode)}&semester=${activeSemester}&token=${encodeURIComponent(idToken || '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="cd-book-btn openlib"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Download size={12} strokeWidth={1.5} /> Download
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          )}

          {/* Reference Books: Removed direct display — users must request books via the Request Book page */}
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
          background: rgba(3, 10, 24, 0.45);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border-bottom: 1px solid var(--glass-border);
        }
        .cd-header-inner {
          max-width: 800px;
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
          font-family: 'Outfit', sans-serif;
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
          font-family: 'Outfit', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--gold);
          letter-spacing: 0.06em;
        }
        .cd-title {
          font-family: 'Cinzel', serif;
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
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          color: var(--text-3);
          font-weight: 500;
        }
        .cd-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .cd-file-count {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          color: var(--text-3);
          font-weight: 500;
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
          max-width: 800px;
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
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 0.9rem;
        }

        .cd-sections {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cd-type-section {
          border-radius: 16px;
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
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .cd-type-count {
          font-family: 'Outfit', sans-serif;
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
        .cd-authors-wrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
        }
        .cd-author-group {
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          overflow: hidden;
        }
        .cd-author-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 10px 14px;
          background: transparent;
          border: none;
          color: var(--text);
          cursor: pointer;
          transition: background 0.2s;
        }
        .cd-author-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .cd-author-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          color: #f0f0f0;
        }
        .cd-author-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.4);
        }
        .cd-author-count {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          background: rgba(255, 255, 255, 0.06);
          padding: 2px 8px;
          border-radius: 6px;
        }
        .cd-author-body {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
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
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.4;
          font-weight: 400;
        }
        .cd-book-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .cd-book-btn {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 6px;
          transition: all 0.15s;
          cursor: pointer;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.03em;
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

        /* --- Dynamic DNA loader --- */
        .dna-loader-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          width: 100%;
          min-height: 350px;
        }
        .dna-loader-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 48px;
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          box-shadow: var(--glass-shadow);
          max-width: 380px;
          width: 100%;
          text-align: center;
        }
        .dna-helix {
          display: flex;
          gap: 7px;
          height: 60px;
          align-items: center;
          justify-content: center;
          perspective: 600px;
          width: 100%;
        }
        .dna-rung {
          position: relative;
          width: 3px;
          height: 52px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          transform-style: preserve-3d;
          animation: dnaRotate 1.8s infinite linear;
          animation-delay: calc(var(--i) * -0.15s);
        }
        .dna-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .dot-1 {
          background: var(--text-2);
        }
        .dot-2 {
          background: rgba(255, 255, 255, 0.3);
        }
        .dna-rung-bar {
          width: 1px;
          flex: 1;
          background: rgba(255, 255, 255, 0.12);
          margin: 2px 0;
        }
        .dna-loader-text {
          margin-top: 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.76rem;
          color: var(--text-2);
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 700;
          animation: textPulse 1.6s infinite ease-in-out;
        }
        @keyframes dnaRotate {
          0% {
            transform: rotateX(0deg);
          }
          100% {
            transform: rotateX(360deg);
          }
        }
        @keyframes textPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .cd-spin { animation: cdSpin 0.7s linear infinite; }
        @keyframes cdSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
