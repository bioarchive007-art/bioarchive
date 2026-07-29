'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { SheetRow } from '@/types';
import { CONFIG } from '@/config';
import { incrementFileDownloads } from '@/lib/api-client';
import { useAuth } from './AuthProvider';
import { checkIsDev } from '@/lib/auth';
import { useToast } from './Toast';
import { getProfessorAcronym } from '@/lib/utils';
import FilePreviewModal from './FilePreviewModal';

type SortField = 'fileName' | 'professor' | 'uploaderName' | 'year' | 'examType' | 'downloadCount';
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

  const columns = React.useMemo(() => {
    const cols: { key: SortField; label: string; width?: string }[] = [
      { key: 'fileName', label: 'File Name' },
      { key: 'professor', label: 'Professor', width: '160px' },
      { key: 'uploaderName', label: 'Uploader', width: '120px' },
      { key: 'year', label: 'Year', width: '80px' },
    ];
    
    if (fileType.toLowerCase() === 'qpaper') {
      cols.push({ key: 'examType', label: 'Exam Type', width: '100px' });
    }
    
    cols.push({ key: 'downloadCount', label: 'Downloads', width: '90px' });
    return cols;
  }, [fileType]);

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
              <td className="sft-td sft-prof" title={file.professor || ''}>
                {file.professor || '—'}
              </td>
              <td className="sft-td sft-uploader">{file.uploaderName || 'Anonymous'}</td>
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
              <td className="sft-td sft-dl-count">{file.downloadCount}</td>
              <td className="sft-td">
                <div className="sft-actions">
                  {file.driveWebViewLink && siteConfig?.enableFilePreviews !== false && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="sft-action-btn"
                      onClick={() => handlePreview(file)}
                      title="Preview"
                    >
                      <Eye size={14} />
                    </motion.button>
                  )}
                  {siteConfig?.enableDownloads !== false && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="sft-action-btn sft-dl-btn"
                      onClick={() => handleDownload(file)}
                      title="Download"
                    >
                      <Download size={14} />
                    </motion.button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
      `}</style>
    </div>
  );
}
