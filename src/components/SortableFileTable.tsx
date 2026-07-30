'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Download, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { SheetRow } from '@/types';
import { CONFIG } from '@/config';
import { incrementFileDownloads } from '@/lib/api-client';
import { useAuth } from './AuthProvider';
import { checkIsDev } from '@/lib/auth';
import { useToast } from './Toast';
import { getProfessorAcronym, formatFileProfessors, getFileProfessors } from '@/lib/utils';
import FilePreviewModal from './FilePreviewModal';

type SortField = 'fileName' | 'professor' | 'uploaderName' | 'year' | 'examType' | 'downloadCount' | 'contentScope';
type SortOrder = 'asc' | 'desc';

interface SortableFileTableProps {
  files: SheetRow[];
  fileType: string;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  accentColor: string;
}

const categoryMeta = CONFIG.FILE_CATEGORIES;

export default function SortableFileTable({
  files,
  fileType,
  sortField,
  sortOrder,
  onSort,
  accentColor,
}: SortableFileTableProps) {
  const { user, triggerLogin, siteConfig } = useAuth();
  const { showToast } = useToast();
  const [previewFile, setPreviewFile] = useState<SheetRow | null>(null);

  const triggerDownloadAction = (file: SheetRow, targetTab?: Window | null) => {
    incrementFileDownloads(file.fileId);
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.driveFileId}`;
    if (targetTab && !targetTab.closed) {
      targetTab.location.href = downloadUrl;
    } else {
      window.open(downloadUrl, '_blank');
    }
  };

  const handleDownload = (file: SheetRow) => {
    // Open blank tab synchronously to prevent popup blocker on mobile Safari
    const newTab = typeof window !== 'undefined' ? window.open('about:blank', '_blank') : null;

    const checkAndDownload = (currUser: any) => {
      if (siteConfig?.requireNiserToDownload) {
        const email = currUser?.email || '';
        const isDev = checkIsDev();
        const isNiser = email.toLowerCase().endsWith('@niser.ac.in');
        const isAdmin = !!currUser?.isAdmin;
        const isBioarchive = email.toLowerCase() === 'bioarchive007@gmail.com' || email.toLowerCase().startsWith('bioarchive007@');
        const isAllowed = isNiser || isAdmin || isBioarchive || (isDev && email.toLowerCase().endsWith('@gmail.com'));
        if (!isAllowed) {
          if (newTab && !newTab.closed) newTab.close();
          showToast('Access Restricted: Only @niser.ac.in institutional accounts are authorized to download study materials.', 'error');
          return;
        }
      }
      triggerDownloadAction(file, newTab);
    };

    if (!user) {
      triggerLogin(() => {
        const cachedUserStr = localStorage.getItem('bioarchive:user');
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            checkAndDownload(cachedUser);
          } catch (e) {
            if (newTab && !newTab.closed) newTab.close();
            checkAndDownload(null);
          }
        } else {
          checkAndDownload(null);
        }
      });
    } else {
      checkAndDownload(user);
    }
  };

  const handlePreview = (file: SheetRow) => {
    if (!user) {
      triggerLogin(() => setPreviewFile(file));
    } else {
      setPreviewFile(file);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc'
      ? <ArrowUp size={12} style={{ marginLeft: 4 }} />
      : <ArrowDown size={12} style={{ marginLeft: 4 }} />;
  };

  const isNotes = fileType.toLowerCase() === 'notes';
  const isQpaper = fileType.toLowerCase() === 'qpaper';
  const isNotesOrSlides = isNotes || fileType.toLowerCase() === 'slides';

  const columns = React.useMemo(() => {
    const cols: { key: SortField; label: string; width?: string }[] = [
      { key: 'fileName', label: 'File Name' },
      { key: 'professor', label: 'Professor', width: '160px' },
      { key: 'uploaderName', label: isNotes ? 'Author' : 'Uploader', width: '130px' },
      { key: 'year', label: 'Year', width: '80px' },
    ];
    
    if (fileType.toLowerCase() === 'qpaper') {
      cols.push({ key: 'examType', label: 'Exam Type', width: '100px' });
    }

    if (isNotesOrSlides) {
      cols.push({ key: 'contentScope', label: 'Portion / Scope', width: '140px' });
    }
    
    cols.push({ key: 'downloadCount', label: 'Downloads', width: '90px' });
    return cols;
  }, [fileType, isNotes, isNotesOrSlides]);

  return (
    <div className="sft-wrapper">
      <table className="sft-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="sft-th"
                style={{ width: col.width }}
                onClick={() => onSort(col.key)}
              >
                <span className="sft-th-inner">
                  {col.label}
                  <SortIcon field={col.key} />
                </span>
              </th>
            ))}
            <th className="sft-th" style={{ width: '80px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr key={file.fileId} className="sft-row">
              <td className="sft-td sft-name">
                <span className="sft-name-text" title={file.fileName}>
                  {file.fileName}
                </span>
              </td>
              <td className="sft-td sft-prof" title={formatFileProfessors(file)}>
                {formatFileProfessors(file)}
              </td>
               <td className="sft-td sft-uploader">
                {isNotes ? (
                  <span
                    className="sft-author-badge"
                    style={{
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59, 130, 246, 0.22)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      display: 'inline-block',
                    }}
                  >
                    {file.authorName
                      ? `${file.authorName}${file.authorBatch ? ` (${file.authorBatch})` : ''}`
                      : file.uploaderName || 'Anonymous'}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-3)', fontSize: '0.78rem' }}>
                    {file.uploaderName || 'Anonymous'}
                  </span>
                )}
               </td>
              <td className="sft-td">
                {file.year ? (
                  <span className="sft-year-badge">{file.year}</span>
                ) : '—'}
              </td>
              {fileType.toLowerCase() === 'qpaper' && (
                <td className="sft-td">
                  {file.examType ? (
                    <span
                      className="sft-exam-badge"
                      style={{ background: accentColor + '18', color: accentColor }}
                    >
                      {file.examType}
                    </span>
                  ) : '—'}
                </td>
              )}
              {isNotesOrSlides && (
                <td className="sft-td">
                  <span
                    className="sft-exam-badge"
                    style={{
                      background: file.contentScope ? accentColor + '18' : 'rgba(255,255,255,0.06)',
                      color: file.contentScope ? accentColor : 'var(--text-3)',
                      fontSize: '0.68rem',
                    }}
                  >
                    {file.contentScope || 'Other'}
                  </span>
                </td>
              )}
              <td className="sft-td sft-dl-count">{file.downloadCount}</td>
              <td className="sft-td">
                <div className="sft-actions">
                  {file.driveWebViewLink && siteConfig?.enableFilePreviews !== false && (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      className="sft-action-btn"
                      onClick={() => handlePreview(file)}
                      title="Preview file"
                    >
                      <Eye size={15} />
                    </motion.button>
                  )}
                  {siteConfig?.enableDownloads !== false && (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      className="sft-action-btn sft-dl-btn"
                      onClick={() => handleDownload(file)}
                      title="Download file"
                    >
                      <Download size={15} />
                    </motion.button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Vertical Cards View (Shown on mobile screens <= 640px) */}
      <div className="sft-mobile-cards">
        <div className="sft-mobile-sort-bar">
          <span className="sft-mobile-sort-label">
            <ArrowUpDown size={12} /> Sort by:
          </span>
          <select
            className="sft-mobile-sort-select"
            value={sortField}
            onChange={(e) => onSort(e.target.value as SortField)}
          >
            {columns.map((col) => (
              <option key={col.key} value={col.key}>
                {col.label} {sortField === col.key ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </option>
            ))}
          </select>
          <button
            className="sft-mobile-sort-dir-btn"
            onClick={() => onSort(sortField)}
            title={`Sort direction: ${sortOrder}`}
          >
            {sortOrder === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
          </button>
        </div>

        {files.map((file) => (
          <div key={file.fileId || file.fileName} className="sft-card">
            <div className="sft-card-header">
              <span className="sft-card-title">{file.fileName}</span>
            </div>

            <div className="sft-card-meta">
              {getFileProfessors(file).length > 0 && (
                <span className="sft-card-tag sft-card-prof">
                  {formatFileProfessors(file)}
                </span>
              )}
              {file.year && (
                <span className="sft-year-badge">
                  {file.year}
                </span>
              )}
              {isQpaper && file.examType && (
                <span
                  className="sft-exam-badge"
                  style={{ background: accentColor + '18', color: accentColor }}
                >
                  {file.examType}
                </span>
              )}
              {isNotesOrSlides && (
                <span
                  className="sft-exam-badge"
                  style={{
                    background: file.contentScope ? accentColor + '18' : 'rgba(255,255,255,0.06)',
                    color: file.contentScope ? accentColor : 'var(--text-3)',
                  }}
                >
                  {file.contentScope || 'Other'}
                </span>
              )}
              <span className="sft-card-tag sft-card-uploader">
                by {isNotes
                  ? (file.authorName ? `${file.authorName}${file.authorBatch ? ` (${file.authorBatch})` : ''}` : (file.uploaderName || 'Anonymous'))
                  : (file.uploaderName || 'Anonymous')
                }
              </span>
              <span className="sft-card-tag sft-card-dl-count">
                {file.downloadCount} dl{file.downloadCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="sft-card-actions">
              {file.driveWebViewLink && siteConfig?.enableFilePreviews !== false && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  className="sft-card-btn sft-card-preview-btn"
                  onClick={() => handlePreview(file)}
                >
                  <Eye size={14} />
                  <span>Preview</span>
                </motion.button>
              )}
              {siteConfig?.enableDownloads !== false && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  className="sft-card-btn sft-card-dl-btn"
                  onClick={() => handleDownload(file)}
                >
                  <Download size={14} />
                  <span>Download</span>
                </motion.button>
              )}
            </div>
          </div>
        ))}
      </div>

      <FilePreviewModal
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDownload={handleDownload}
      />

      <style jsx>{`
        .sft-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          background: var(--panel);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          box-shadow: var(--glass-shadow);
        }
        .sft-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }
        .sft-th {
          padding: 10px 14px;
          text-align: left;
          font-family: 'Outfit', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          user-select: none;
          transition: color 0.15s;
          white-space: nowrap;
        }
        .sft-th:hover { color: rgba(255,255,255,0.7); }
        .sft-th-inner {
          display: inline-flex;
          align-items: center;
        }
        .sft-row {
          transition: background 0.12s;
        }
        .sft-row:hover { background: rgba(255,255,255,0.03); }
        .sft-td {
          padding: 10px 14px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.7);
          border-bottom: 1px solid rgba(255,255,255,0.03);
          vertical-align: middle;
          font-weight: 400;
        }
        .sft-name {
          max-width: 260px;
          min-width: 150px;
        }
        .sft-name-text {
          display: block;
          color: #e0e0e0;
          font-family: 'Outfit', sans-serif;
          white-space: normal;
          overflow-wrap: break-word;
          word-break: break-word;
          line-height: 1.4;
        }
        .sft-prof, .sft-uploader {
          color: rgba(255,255,255,0.5);
          font-size: 0.78rem;
        }
        .sft-year-badge {
          font-size: 0.7rem;
          font-weight: 700;
          color: #daa520;
          background: rgba(218,165,32,0.1);
          padding: 2px 8px;
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
        }
        .sft-exam-badge {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
        }
        .sft-dl-count {
          text-align: center;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.35);
        }
        .sft-actions {
          display: flex;
          gap: 4px;
        }
        .sft-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.45);
          cursor: pointer;
          transition: all 0.15s;
        }
        .sft-action-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .sft-dl-btn:hover {
          background: rgba(2, 132, 199, 0.15);
          color: var(--green-bright);
          border-color: rgba(2, 132, 199, 0.3);
        }
        .sft-mobile-cards {
          display: none;
          flex-direction: column;
          gap: 10px;
          padding: 10px;
        }
        .sft-mobile-sort-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          margin-bottom: 2px;
        }
        .sft-mobile-sort-label {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-3);
          font-family: 'Outfit', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .sft-mobile-sort-select {
          flex: 1;
          background: var(--bg2);
          border: 1px solid var(--glass-border-hover);
          color: var(--text);
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 0.76rem;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          outline: none;
        }
        .sft-mobile-sort-dir-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--glass-border);
          color: var(--green-light);
          cursor: pointer;
          transition: all 0.2s;
        }
        .sft-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        .sft-card-title {
          font-family: 'Outfit', sans-serif;
          font-size: 0.88rem;
          font-weight: 600;
          color: #e0e0e0;
          line-height: 1.35;
          word-break: break-word;
        }
        .sft-card-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
        }
        .sft-card-tag {
          color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.04);
          padding: 2px 8px;
          border-radius: 8px;
        }
        .sft-card-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }
        .sft-card-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
          padding: 8px 12px;
          border-radius: 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.8);
          transition: all 0.15s;
        }
        .sft-card-preview-btn:hover, .sft-card-preview-btn:active {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .sft-card-dl-btn {
          background: rgba(2, 132, 199, 0.15);
          color: #daa520;
          border-color: rgba(218, 165, 32, 0.3);
        }
        .sft-card-dl-btn:hover, .sft-card-dl-btn:active {
          background: rgba(218, 165, 32, 0.25);
          color: #fff;
        }
        @media (max-width: 640px) {
          .sft-table {
            display: none !important;
          }
          .sft-mobile-cards {
            display: flex !important;
          }
          .sft-wrapper {
            overflow-x: visible;
            border: none;
            background: transparent;
            box-shadow: none;
          }
        }
      `}</style>
    </div>
  );
}
