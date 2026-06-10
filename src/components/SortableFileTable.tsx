'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { SheetRow } from '@/types';
import { CONFIG } from '@/config';
import { incrementFileDownloads } from '@/lib/api-client';

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
  const handleDownload = (file: SheetRow) => {
    incrementFileDownloads(file.fileId);
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${file.driveFileId}`;
    window.open(downloadUrl, '_blank');
  };

  const handlePreview = (file: SheetRow) => {
    if (file.driveWebViewLink) {
      const url = file.driveWebViewLink.replace(/\/view.*$/, '/preview');
      window.open(url, '_blank');
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
      { key: 'professor', label: 'Professor', width: '140px' },
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
              <td className="sft-td sft-prof">{file.professor || '—'}</td>
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
                  {file.driveWebViewLink && (
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
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="sft-action-btn sft-dl-btn"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >
                    <Download size={14} />
                  </motion.button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .sft-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px;
          background: rgba(255,255,255,0.02);
        }
        .sft-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 640px;
        }
        .sft-th {
          padding: 10px 14px;
          text-align: left;
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
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
          font-family: 'Playwrite England Joined', 'Playwrite GB J', sans-serif;
          font-size: 0.82rem;
          color: rgba(255,255,255,0.7);
          border-bottom: 1px solid rgba(255,255,255,0.03);
          vertical-align: middle;
        }
        .sft-name {
          max-width: 260px;
        }
        .sft-name-text {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #e0e0e0;
        }
        .sft-prof, .sft-uploader {
          color: rgba(255,255,255,0.5);
          font-size: 0.78rem;
        }
        .sft-year-badge {
          font-size: 0.7rem;
          font-weight: 600;
          color: #daa520;
          background: rgba(218,165,32,0.1);
          padding: 2px 8px;
          border-radius: 10px;
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
