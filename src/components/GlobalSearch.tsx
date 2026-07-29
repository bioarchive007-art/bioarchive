'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, FileText, Download, Eye, Loader2, X } from 'lucide-react';
import { CURRICULUM, Course } from '@/data/curriculum';
import { SheetRow } from '@/types';
import { incrementFileDownloads } from '@/lib/api-client';
import { CONFIG } from '@/config';
import { findProfessorProfile } from '@/lib/search-utils';

const categoryMeta = CONFIG.FILE_CATEGORIES;

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [matchingFiles, setMatchingFiles] = useState<SheetRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flatten courses with their semester for easy searching
  const coursesList = useMemo(() => {
    const list: { course: Course; semester: string }[] = [];
    for (const [semester, courses] of Object.entries(CURRICULUM)) {
      for (const course of courses) {
        list.push({ course, semester });
      }
    }
    return list;
  }, []);

  // Filter courses locally with smart professor & alias resolution
  const matchedCourses = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const profProfile = findProfessorProfile(q);

    return coursesList.filter((item) => {
      const nameMatch = item.course.name.toLowerCase().includes(q);
      const codeMatch = item.course.code.toLowerCase().includes(q);

      let profMatch = false;
      if (item.course.professors && item.course.professors.length > 0) {
        profMatch = item.course.professors.some((p) => {
          const pLower = p.toLowerCase();
          if (pLower.includes(q)) return true;
          if (profProfile) {
            if (pLower.includes(profProfile.name.toLowerCase()) || profProfile.aliases.some(alias => pLower.includes(alias))) {
              return true;
            }
          }
          return false;
        });
      }

      return nameMatch || codeMatch || profMatch;
    });
  }, [query, coursesList]);

  // Click outside to close results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch matching files with debounce
  useEffect(() => {
    if (!query.trim()) {
      setMatchingFiles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setMatchingFiles(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const handleDownload = (file: SheetRow, e: React.MouseEvent) => {
    e.stopPropagation();
    incrementFileDownloads(file.fileId);
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.driveFileId}`;
    window.open(downloadUrl, '_blank');
  };

  const handlePreview = (file: SheetRow, e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.driveWebViewLink) {
      const url = file.driveWebViewLink.replace(/\/view.*$/, '/preview');
      window.open(url, '_blank');
    }
  };

  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Reset selectedIndex on query change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  const allResultItems = useMemo(() => {
    const items: Array<{ type: 'course'; course: Course; semester: string } | { type: 'file'; file: SheetRow }> = [];
    matchedCourses.forEach(c => items.push({ type: 'course', course: c.course, semester: c.semester }));
    matchingFiles.forEach(f => items.push({ type: 'file', file: f }));
    return items;
  }, [matchedCourses, matchingFiles]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || allResultItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < allResultItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : allResultItems.length - 1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allResultItems.length) {
        const item = allResultItems[selectedIndex];
        if (item.type === 'course') {
          window.location.href = `/course/${encodeURIComponent(item.course.code)}?semester=${encodeURIComponent(item.semester)}`;
          setIsOpen(false);
        } else if (item.type === 'file' && item.file.driveWebViewLink) {
          const url = item.file.driveWebViewLink.replace(/\/view.*$/, '/preview');
          window.open(url, '_blank');
          setIsOpen(false);
        }
      }
    }
  };

  const clearSearch = () => {
    setQuery('');
    setMatchingFiles([]);
    setSelectedIndex(-1);
    setIsOpen(false);
  };

  const hasResults = matchedCourses.length > 0 || matchingFiles.length > 0;

  return (
    <div className="global-search-container" ref={containerRef}>
      <div className={`search-input-wrapper ${isFocused ? 'focused' : ''}`}>
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search files, courses, topics, or professors..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => { setIsOpen(true); setIsFocused(true); }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className="search-input"
        />
        {isLoading && (
          <div className="search-loader">
            <Loader2 size={16} className="spinner" />
          </div>
        )}
        {!isLoading && query && (
          <button onClick={clearSearch} className="search-clear-btn" aria-label="Clear search">
            <X size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && query.trim().length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="search-results-dropdown"
          >
            {!isLoading && !hasResults ? (
              <div className="search-no-results">
                No courses or files found matching &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="search-results-content">
                {/* Courses section */}
                {matchedCourses.length > 0 && (
                  <div className="search-section">
                    <h4 className="search-section-title">Courses</h4>
                    <div className="search-courses-list">
                      {matchedCourses.map(({ course, semester }, idx) => {
                        const isSelected = selectedIndex === idx;
                        return (
                          <Link key={course.code} href={`/course/${encodeURIComponent(course.code)}?semester=${semester}`} passHref legacyBehavior>
                            <motion.a
                              className={`search-course-item ${isSelected ? 'selected' : ''}`}
                              onClick={() => setIsOpen(false)}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.03, duration: 0.2 }}
                            >
                              <div className="sci-badge">
                                {semester === 'ADVANCE COURSES' ? 'ADV' : `S${semester}`}
                              </div>
                              <div className="sci-info">
                                <span className="sci-code">{course.code}</span>
                                <span className="sci-name">{course.name}</span>
                              </div>
                              <BookOpen size={14} className="sci-icon" />
                            </motion.a>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Files section */}
                {matchingFiles.length > 0 && (
                  <div className="search-section">
                    <h4 className="search-section-title">Files</h4>
                    <div className="search-files-list">
                      {matchingFiles.map((file, idx) => {
                        const fileTypeLower = file.fileType?.toLowerCase();
                        const cat = categoryMeta[fileTypeLower as keyof typeof categoryMeta] || categoryMeta.other;
                        const isSelected = selectedIndex === matchedCourses.length + idx;
                        return (
                          <motion.div
                            key={file.fileId}
                            className={`search-file-item ${isSelected ? 'selected' : ''}`}
                            onClick={(e) => handlePreview(file, e)}
                            title="Preview file"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.2 }}
                          >
                            <div className="sfi-type-icon" style={{ background: cat.colorHex + '18', color: cat.colorHex }}>
                              <FileText size={14} />
                            </div>
                            <div className="sfi-info">
                              <span className="sfi-name">{file.fileName}</span>
                              <div className="sfi-meta">
                                <span className="sfi-course-code">{file.courseCode}</span>
                                <span className="sfi-divider">•</span>
                                <span className="sfi-type-label">{cat.label}</span>
                                {file.year && (
                                  <>
                                    <span className="sfi-divider">•</span>
                                    <span className="sfi-year">{file.year}</span>
                                  </>
                                )}
                                {file.professor && (
                                  <>
                                    <span className="sfi-divider">•</span>
                                    <span className="sfi-prof">{file.professor}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="sfi-actions">
                              {file.driveWebViewLink && (
                                <button
                                  className="sfi-action-btn"
                                  onClick={(e) => handlePreview(file, e)}
                                  title="Preview"
                                >
                                  <Eye size={13} />
                                </button>
                              )}
                              <button
                                className="sfi-action-btn sfi-dl"
                                onClick={(e) => handleDownload(file, e)}
                                title="Download"
                              >
                                <Download size={13} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .global-search-container {
          position: relative;
          max-width: 600px;
          width: 100%;
          z-index: 100;
          margin-bottom: 24px;
        }
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          transition: transform 0.2s var(--ease-spring);
        }
        .search-input-wrapper.focused {
          transform: scale(1.01);
        }
        .search-input-wrapper.focused .search-input {
          border-color: var(--glass-border-hover);
          background: rgba(255, 255, 255, 0.06);
          box-shadow: var(--glass-shadow-hover);
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-3);
          pointer-events: none;
          z-index: 10;
        }
        .search-input {
          width: 100%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 12px 42px 12px 40px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem;
          color: var(--text);
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
          position: relative;
          z-index: 5;
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          box-shadow: var(--glass-shadow);
        }
        .search-input::placeholder {
          color: var(--text-3);
        }
        .search-input:focus {
          box-shadow: 0 4px 24px rgba(2, 132, 199, 0.06);
        }
        .search-loader {
          position: absolute;
          right: 40px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--green-light);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .search-clear-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--text-3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.15s, color 0.15s;
        }
        .search-clear-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-2);
        }
        .search-results-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: var(--panel);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border-hover);
          border-radius: 16px;
          max-height: 480px;
          overflow-y: auto;
          box-shadow: var(--glass-shadow-hover);
        }
        .search-no-results {
          padding: 20px;
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem;
          color: var(--text-3);
        }
        .search-results-content {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .search-section {
          display: flex;
          flex-direction: column;
        }
        .search-section-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.68rem;
          font-weight: 700;
          color: var(--text-3);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 4px 8px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          margin-bottom: 6px;
        }
        .search-courses-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .search-course-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.15s;
          text-decoration: none;
          color: var(--text-2);
        }
        .search-course-item:hover,
        .search-course-item.selected {
          background: rgba(2, 132, 199, 0.15);
          color: var(--text);
        }
        .sci-badge {
          font-family: 'Outfit', sans-serif;
          font-size: 0.6rem;
          font-weight: 700;
          color: var(--green-light);
          background: rgba(2, 132, 199, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          min-width: 34px;
          text-align: center;
        }
        .sci-info {
          flex: 1;
          display: flex;
          gap: 8px;
          min-width: 0;
          font-size: 0.8rem;
        }
        .sci-code {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          color: var(--gold);
        }
        .sci-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sci-icon {
          color: var(--text-3);
        }
        .search-files-list {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .search-file-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.15s;
          cursor: pointer;
        }
        .search-file-item:hover,
        .search-file-item.selected {
          background: rgba(2, 132, 199, 0.15);
        }
        .sfi-type-icon {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          flex-shrink: 0;
        }
        .sfi-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sfi-name {
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sfi-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.68rem;
          color: var(--text-3);
        }
        .sfi-course-code {
          color: var(--gold);
          font-weight: 500;
        }
        .sfi-divider {
          opacity: 0.5;
        }
        .sfi-actions {
          display: flex;
          gap: 4px;
          opacity: 0.4;
          transition: opacity 0.15s;
        }
        .search-file-item:hover .sfi-actions {
          opacity: 1;
        }
        .sfi-action-btn {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .sfi-action-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text);
        }
        .sfi-dl:hover {
          background: rgba(2, 132, 199, 0.15);
          color: var(--green-bright);
          border-color: rgba(2, 132, 199, 0.3);
        }
      `}</style>
    </div>
  );
}
