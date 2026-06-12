'use client';

import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Upload, FileUp, ChevronRight, ChevronLeft, Check, AlertTriangle,
  Loader2, Sparkles, Trash2,
} from 'lucide-react';

import { CONFIG } from '@/config';
import { CURRICULUM, Course } from '@/data/curriculum';
import { generateRenamedFilename } from '@/lib/file-renaming';
import {
  createUploadSession,
  confirmUpload,
} from '@/lib/api-client';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourseCode?: string;
  initialSemester?: string;
  initialFileType?: string;
  initialYear?: string;
  initialRequestId?: string;
}

const STEPS = ['Details', 'Files', 'Review & Submit'];
const stepVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 50 : dir < 0 ? -50 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -50 : dir < 0 ? 50 : 0,
    opacity: 0,
  }),
};
const FILE_CATEGORY_KEYS = Object.keys(CONFIG.FILE_CATEGORIES) as (keyof typeof CONFIG.FILE_CATEGORIES)[];
const EXAM_TYPES = ['Mid-Semester', 'End-Semester', 'Quiz', 'Supplementary', 'Other'];
const SEMESTER_KEYS = [...CONFIG.NISER_SEMESTERS.map(String), 'ADVANCE COURSES'];

export default function UploadModal({
  isOpen,
  onClose,
  initialCourseCode = '',
  initialSemester = '',
  initialFileType = '',
  initialYear = '',
  initialRequestId = '',
}: UploadModalProps) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 0: Details
  const [fileType, setFileType] = useState('');
  const [examType, setExamType] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [semester, setSemester] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [professor, setProfessor] = useState('');
  const [professor2, setProfessor2] = useState('');
  const [professor3, setProfessor3] = useState('');
  const [requestId, setRequestId] = useState('');

  // Step 1: Files
  const [files, setFiles] = useState<File[]>([]);

  // Step 2: Review & Submit
  const [uploaderName, setUploaderName] = useState('');
  const [showName, setShowName] = useState(true);
  const [remarks, setRemarks] = useState('');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const isQpaper = fileType === 'qpaper';
  const allowMultiple = !isQpaper && fileType !== '';

  // Derived
  const courses = useMemo(
    () => (semester ? CURRICULUM[semester] || [] : []),
    [semester]
  );
  const selectedCourse = useMemo(
    () => courses.find((c) => c.code === courseCode),
    [courses, courseCode]
  );

  const canonicalFileNames = useMemo(() => {
    if (!fileType || !courseCode || !selectedCourse || files.length === 0) return [];
    return files.map((f) =>
      generateRenamedFilename(f.name, {
        courseCode,
        professor,
        fileType,
        year,
        examType: isQpaper ? examType : undefined,
      })
    );
  }, [files, fileType, courseCode, selectedCourse, year, examType, isQpaper, professor]);

  // Reset or prefill on close/open
  useEffect(() => {
    if (isOpen) {
      if (initialCourseCode) setCourseCode(initialCourseCode);
      if (initialSemester) setSemester(initialSemester);
      if (initialFileType) setFileType(initialFileType);
      if (initialYear) setYear(initialYear);
      if (initialRequestId) setRequestId(initialRequestId);
    } else {
      setTimeout(() => {
        setStep(0);
        setDirection(0);
        setFiles([]);
        setFileType('');
        setExamType('');
        setYear(new Date().getFullYear().toString());
        setSemester('');
        setCourseCode('');
        setProfessor('');
        setProfessor2('');
        setProfessor3('');
        setRequestId('');
        setRemarks('');
        setUploaderName('');
        setShowName(true);
        setUploading(false);
        setProgress(0);
        setUploadStatus('');
        setSuccess(false);
        setError('');
        setShowWarning(false);
      }, 300);
    }
  }, [isOpen, initialCourseCode, initialSemester, initialFileType, initialYear, initialRequestId]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length === 0) return;
    if (isQpaper) {
      setFiles([dropped[0]]);
    } else {
      setFiles((prev) => [...prev, ...dropped]);
    }
  }, [isQpaper]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    if (isQpaper) {
      setFiles([selected[0]]);
    } else {
      setFiles((prev) => [...prev, ...selected]);
    }
    // Reset input so re-selecting the same file works
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [isQpaper]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Validation
  const isValidYear = useMemo(() => {
    if (!year) return false;
    const y = parseInt(year, 10);
    return /^\d{4}$/.test(year) && !isNaN(y) && y <= new Date().getFullYear();
  }, [year]);

  const canProceedStep0 =
    fileType && isValidYear && semester && courseCode && professor &&
    (fileType !== 'qpaper' || examType);
  const canProceedStep1 = files.length > 0;
  const canSubmit = canProceedStep0 && canProceedStep1;

  const handleSubmit = async () => {
    if (!selectedCourse || !canSubmit || files.length === 0) return;
    setUploading(true);
    setProgress(0);
    setError('');
    setShowWarning(true);

    try {
      const displayName = showName ? uploaderName : 'Anonymous';
      const filesToUpload = [...files];
      const totalFiles = filesToUpload.length;
      const fileProgresses = new Array(totalFiles).fill(0);
      const duplicateWarnings: string[] = [];

      // Step A: Create upload sessions sequentially to avoid concurrent folder creation race conditions
      setUploadStatus(`Preparing upload sessions...`);
      const sessions: any[] = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const currentFile = filesToUpload[i];
        const session = await createUploadSession({
          fileName: currentFile.name,
          mimeType: currentFile.type,
          fileSize: currentFile.size,
          courseCode,
          courseName: selectedCourse.name,
          semester,
          fileType,
          examType: isQpaper ? examType : '',
          year,
          professor,
          professor2,
          professor3,
          uploaderName: displayName,
          remarks,
        });
        sessions.push(session);
      }

      // Step B: Upload all files concurrently to Google Drive
      setUploadStatus(`Uploading ${totalFiles} file(s) in parallel...`);
      const uploadPromises = filesToUpload.map(async (currentFile, index) => {
        const session = sessions[index];

        // Step C: Upload file bytes in chunks to Google Drive via server proxy with progress tracking and automatic retry
        const totalSize = currentFile.size;
        const chunkSize = 5 * 1024 * 1024; // 5MB chunks (must be a multiple of 256KB)
        let start = 0;
        let driveData: { id: string; webViewLink: string; md5Checksum: string } | null = null;

        while (start < totalSize) {
          const end = Math.min(start + chunkSize, totalSize);
          const chunk = currentFile.slice(start, end);
          const isLast = end === totalSize;

          let chunkResult = null;
          let retries = 3;
          let delay = 1000;

          while (retries > 0) {
            try {
              chunkResult = await new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', '/api/upload/drive');
                xhr.setRequestHeader('Content-Type', currentFile.type);
                xhr.setRequestHeader('X-Upload-Url', session.driveUploadUrl);
                xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${totalSize}`);

                xhr.upload.onprogress = (e) => {
                  if (e.lengthComputable) {
                    const chunkPct = e.loaded / e.total;
                    const bytesUploaded = start + chunkPct * (end - start);
                    const pct = Math.round((bytesUploaded / totalSize) * 100);

                    fileProgresses[index] = pct;
                    const overallPct = Math.round(fileProgresses.reduce((sum, p) => sum + p, 0) / totalFiles);
                    setProgress(Math.min(95, overallPct));
                  }
                };

                xhr.onload = () => {
                  if (xhr.status === 200 || xhr.status === 201 || xhr.status === 308) {
                    try {
                      resolve(JSON.parse(xhr.responseText));
                    } catch {
                      reject(new Error('Invalid response from upload server'));
                    }
                  } else {
                    try {
                      const errData = JSON.parse(xhr.responseText);
                      reject(new Error(errData.error || `Upload failed with status ${xhr.status}`));
                    } catch {
                      reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                  }
                };

                xhr.onerror = () => reject(new Error('Network error uploading chunk'));
                xhr.onabort = () => reject(new Error('Upload was cancelled'));
                xhr.send(chunk);
              });
              break; // Success, exit retry loop
            } catch (err: any) {
              retries--;
              if (retries === 0) {
                throw new Error(`Failed to upload chunk of "${currentFile.name}": ${err.message}`);
              }
              // Wait before retrying
              await new Promise(r => setTimeout(r, delay));
              delay *= 2; // exponential backoff
            }
          }

          if (isLast) {
            driveData = chunkResult;
          }
          start = end;
        }

        if (!driveData) {
          throw new Error(`Failed to upload "${currentFile.name}" (no drive data returned)`);
        }

        return { session, driveData, file: currentFile };
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Step 2: Confirm all uploads sequentially on the backend to avoid sheet conflicts/zip race conditions
      for (let i = 0; i < uploadResults.length; i++) {
        const { session, driveData, file } = uploadResults[i];
        setUploadStatus(`Confirming upload ${i + 1}/${totalFiles}: ${file.name}`);

        const isLastFile = i === uploadResults.length - 1;

        const result = await confirmUpload({
          driveFileId: driveData.id || '',
          r2Key: '',
          canonicalFileName: session.canonicalFileName,
          mimeType: file.type,
          isLastFile,
          batchFiles: isLastFile ? canonicalFileNames : undefined,
          metadata: {
            ...session.metadata,
            driveWebViewLink: driveData.webViewLink || '',
            md5Hash: driveData.md5Checksum || '',
            requestId: requestId || undefined,
          },
        });

        if (result.error === 'duplicate') {
          duplicateWarnings.push(
            `"${file.name}" is a duplicate of "${result.existingFile?.fileName}"`
          );
        }
      }

      setProgress(100);
      setUploadStatus('');
      if (duplicateWarnings.length > 0 && duplicateWarnings.length < totalFiles) {
        setError(`Some files were duplicates: ${duplicateWarnings.join('; ')}. Other files uploaded successfully.`);
      }
      setSuccess(true);
      setShowWarning(false);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      setShowWarning(false);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="um-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="um-panel"
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button className="um-close" onClick={onClose}><X size={18} /></button>

              {/* Mobile warning overlay */}
              <AnimatePresence>
                {showWarning && (
                  <motion.div
                    className="um-warning-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="um-warning-card">
                      <AlertTriangle size={28} style={{ color: '#daa520' }} />
                      <h3 className="um-warning-title">Important Notice</h3>
                      <p className="um-warning-desc">
                        Please keep this screen/browser window active. Switching apps or locking your device may pause or interrupt the upload.
                      </p>
                      <button className="um-warning-btn" onClick={() => setShowWarning(false)}>
                        Okay
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <div className="um-header">
                <Upload size={20} className="um-header-icon" />
                <h2 className="um-title">Upload Material</h2>
              </div>

              {/* Steps indicator */}
              {!success && (
                <div className="um-steps">
                  {STEPS.map((s, i) => (
                    <div key={s} className={`um-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
                      <span className="um-step-dot">{i < step ? <Check size={10} /> : i + 1}</span>
                      <span className="um-step-label">{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="um-error">
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {/* Success state */}
              {success ? (
                <motion.div
                  className="um-success"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <div className="um-success-sparkles">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <motion.span
                        key={i}
                        className="um-sparkle"
                        initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                        animate={{
                          opacity: [0, 1, 0],
                          scale: [0, 1.2, 0],
                          x: (Math.random() - 0.5) * 120,
                          y: (Math.random() - 0.5) * 120,
                        }}
                        transition={{ delay: i * 0.06, duration: 0.8 }}
                      >
                        <Sparkles size={14} />
                      </motion.span>
                    ))}
                  </div>
                  <div className="um-success-check">
                    <Check size={36} />
                  </div>
                  <h3>Upload Successful!</h3>
                  <p className="um-success-file">
                    {files.length === 1
                      ? canonicalFileNames[0]
                      : `${files.length} files uploaded successfully`
                    }
                  </p>
                  <button className="um-success-btn" onClick={onClose}>Done</button>
                </motion.div>
              ) : (
                <>
                  <AnimatePresence mode="wait" initial={false} custom={direction}>
                    {/* ===== STEP 0: Details ===== */}
                    {step === 0 && (
                      <motion.div
                        key="step0"
                        custom={direction}
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="um-body"
                      >
                        {/* File type selector */}
                        <label className="um-label">File Type</label>
                        <div className="um-type-grid">
                          {FILE_CATEGORY_KEYS.map((key) => {
                            const cat = CONFIG.FILE_CATEGORIES[key];
                            return (
                              <button
                                key={key}
                                className={`um-type-btn ${fileType === key ? 'selected' : ''}`}
                                onClick={() => { setFileType(key); setFiles([]); }}
                                style={fileType === key ? { borderColor: cat.colorHex, background: cat.colorHex + '15' } : {}}
                              >
                                <span>{cat.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Exam type (qpaper only) */}
                        {fileType === 'qpaper' && (
                          <>
                            <label className="um-label">Exam Type</label>
                            <div className="um-exam-row">
                              {EXAM_TYPES.map((et) => (
                                <button
                                  key={et}
                                  className={`um-pill ${examType === et ? 'selected' : ''}`}
                                  onClick={() => setExamType(et)}
                                >
                                  {et}
                                </button>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Year */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label className="um-label">Year</label>
                          {year && year.length === 4 && !isValidYear && (
                            <span style={{ color: '#f87171', fontSize: '0.7rem', fontFamily: "'Outfit', sans-serif" }}>
                              {parseInt(year, 10) > new Date().getFullYear() ? "Future year is not allowed" : "Invalid year"}
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          className="um-input"
                          value={year}
                          onChange={(e) => setYear(e.target.value)}
                          placeholder="e.g. 2024"
                          maxLength={4}
                        />

                        {/* Semester */}
                        <label className="um-label">Semester</label>
                        <div className="um-sem-row">
                          {SEMESTER_KEYS.map((s) => (
                            <button
                              key={s}
                              className={`um-pill ${semester === s ? 'selected' : ''}`}
                              onClick={() => { setSemester(s); setCourseCode(''); setProfessor(''); }}
                            >
                              {s === 'ADVANCE COURSES' ? 'ADV' : `Sem ${s}`}
                            </button>
                          ))}
                        </div>

                        {/* Course */}
                        {semester && (
                          <>
                            <label className="um-label">Course</label>
                            <select
                              className="um-select"
                              value={courseCode}
                              onChange={(e) => { setCourseCode(e.target.value); setProfessor(''); }}
                            >
                              <option value="">Select course...</option>
                              {courses.map((c) => (
                                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                              ))}
                            </select>
                          </>
                        )}

                        {/* Professors */}
                        {selectedCourse && (
                          <>
                            <label className="um-label">Professor</label>
                            <select
                              className="um-select"
                              value={professor}
                              onChange={(e) => setProfessor(e.target.value)}
                            >
                              <option value="">Select professor...</option>
                              {selectedCourse.professors.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>

                            <label className="um-label">Professor 2 (optional)</label>
                            <select
                              className="um-select"
                              value={professor2}
                              onChange={(e) => setProfessor2(e.target.value)}
                            >
                              <option value="">None</option>
                              {selectedCourse.professors.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>

                            <label className="um-label">Professor 3 (optional)</label>
                            <select
                              className="um-select"
                              value={professor3}
                              onChange={(e) => setProfessor3(e.target.value)}
                            >
                              <option value="">None</option>
                              {selectedCourse.professors.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </>
                        )}
                      </motion.div>
                    )}

                    {/* ===== STEP 1: Files ===== */}
                    {step === 1 && (
                      <motion.div
                        key="step1"
                        custom={direction}
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="um-body"
                      >
                        <div className="um-file-mode-hint">
                          {isQpaper
                            ? 'Question Paper — single file only'
                            : `${CONFIG.FILE_CATEGORIES[fileType as keyof typeof CONFIG.FILE_CATEGORIES]?.label || 'Files'} — you can upload multiple files`
                          }
                        </div>

                        {/* Dropzone */}
                        <div
                          className={`um-dropzone ${dragOver ? 'drag-over' : ''} ${files.length > 0 ? 'has-file' : ''}`}
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={handleFileDrop}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="um-file-input"
                            accept={CONFIG.ALLOWED_FILE_TYPES.map(t => `.${t}`).join(',')}
                            multiple={allowMultiple}
                            onChange={handleFileChange}
                          />
                          <div className="um-drop-prompt">
                            <Upload size={28} />
                            <span>
                              {files.length > 0
                                ? (isQpaper ? 'Click to replace file' : 'Drop more files or click to browse')
                                : 'Drop file here or click to browse'
                              }
                            </span>
                            <span className="um-drop-hint">
                              {CONFIG.ALLOWED_FILE_TYPES.join(', ')} · Max {CONFIG.MAX_FILE_SIZE_MB} MB
                            </span>
                          </div>
                        </div>

                        {/* File list */}
                        {files.length > 0 && (
                          <div className="um-file-list">
                            {files.map((f, idx) => (
                              <div key={`${f.name}-${idx}`} className="um-file-item">
                                <FileUp size={16} className="um-file-item-icon" />
                                <div className="um-file-item-info">
                                  <span className="um-file-item-name">{f.name}</span>
                                  <span className="um-file-item-size">{(f.size / (1024 * 1024)).toFixed(1)} MB</span>
                                </div>
                                <button
                                  className="um-file-item-remove"
                                  onClick={() => removeFile(idx)}
                                  title="Remove file"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <div className="um-file-count-summary">
                              {files.length} file{files.length !== 1 ? 's' : ''} selected ·{' '}
                              {(files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(1)} MB total
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* ===== STEP 2: Review & Submit ===== */}
                    {step === 2 && (
                      <motion.div
                        key="step2"
                        custom={direction}
                        variants={stepVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.22, ease: 'easeInOut' }}
                        className="um-body"
                      >
                        <label className="um-label">Your Name</label>
                        <input
                          type="text"
                          className="um-input"
                          value={uploaderName}
                          onChange={(e) => setUploaderName(e.target.value)}
                          placeholder="Enter your name"
                        />
                        <div className="um-consent">
                          <button
                            className={`um-toggle ${showName ? 'on' : ''}`}
                            onClick={() => setShowName(!showName)}
                          >
                            <span className="um-toggle-knob" />
                          </button>
                          <span className="um-consent-text">
                            {showName ? 'Show my name' : 'Upload anonymously'}
                          </span>
                        </div>

                        <label className="um-label">Remarks (optional)</label>
                        <textarea
                          className="um-textarea"
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Any notes about these files..."
                          rows={2}
                        />

                        {/* Summary */}
                        <div className="um-preview-section">
                          <label className="um-label">Upload Summary</label>
                          <div className="um-summary">
                            <div className="um-summary-row">
                              <span>Type</span>
                              <span>{CONFIG.FILE_CATEGORIES[fileType as keyof typeof CONFIG.FILE_CATEGORIES]?.label || fileType}</span>
                            </div>
                            {isQpaper && examType && (
                              <div className="um-summary-row">
                                <span>Exam</span><span>{examType}</span>
                              </div>
                            )}
                            <div className="um-summary-row">
                              <span>Course</span><span>{courseCode} {selectedCourse?.name || ''}</span>
                            </div>
                            <div className="um-summary-row">
                              <span>Semester</span><span>{semester}</span>
                            </div>
                            <div className="um-summary-row">
                              <span>Professor</span><span>{professor}</span>
                            </div>
                            <div className="um-summary-row">
                              <span>Year</span><span>{year}</span>
                            </div>
                            <div className="um-summary-row">
                              <span>Files</span><span>{files.length} file{files.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>

                          {/* Generated filenames preview */}
                          {canonicalFileNames.length > 0 && (
                            <>
                              <label className="um-label" style={{ marginTop: 12 }}>Generated Filename{files.length > 1 ? 's' : ''}</label>
                              <div className="um-canonical-list">
                                {canonicalFileNames.map((name, idx) => (
                                  <div key={idx} className="um-preview-box">{name}</div>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Progress bar */}
                  {uploading && (
                    <div className="um-progress-section">
                      <div className="um-progress-wrap">
                        <div className="um-progress">
                          <div className="um-progress-bar" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="um-progress-text">{progress}%</span>
                      </div>
                      {uploadStatus && (
                        <div className="um-upload-status">{uploadStatus}</div>
                      )}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="um-footer">
                    {step > 0 && !uploading && (
                      <button className="um-nav-btn" onClick={() => { setDirection(-1); setStep(step - 1); }}>
                        <ChevronLeft size={16} /> Back
                      </button>
                    )}
                    <div style={{ flex: 1 }} />
                    {step < 2 && (
                      <button
                        className="um-nav-btn um-next"
                        disabled={step === 0 ? !canProceedStep0 : !canProceedStep1}
                        onClick={() => { setDirection(1); setStep(step + 1); }}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    )}
                    {step === 2 && !uploading && (
                      <button
                        className="um-submit-btn"
                        disabled={!canSubmit}
                        onClick={handleSubmit}
                      >
                        <Upload size={16} /> Upload {files.length > 1 ? `${files.length} Files` : 'File'}
                      </button>
                    )}
                    {uploading && (
                      <button className="um-submit-btn" disabled>
                        <Loader2 size={16} className="um-spinner" /> Uploading...
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .um-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 400;
          padding: 16px;
          backdrop-filter: blur(4px);
        }
        .um-panel {
          position: relative;
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          overflow-x: hidden;
          background: rgba(3, 10, 24, 0.96);
          backdrop-filter: blur(24px);
          border: 1px solid rgba(2, 132, 199, 0.25);
          border-radius: 20px;
          padding: 28px;
          scrollbar-width: thin;
          scrollbar-color: rgba(2,132,199,0.15) transparent;
        }
        .um-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          padding: 6px;
          transition: all 0.15s;
          z-index: 5;
        }
        .um-close:hover { background: rgba(255,0,0,0.15); color: #fff; }
        .um-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .um-header-icon { color: #daa520; }
        .um-title {
          font-family: 'Cinzel', serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: #f0f0f0;
          margin: 0;
        }
        .um-steps {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
        }
        .um-step {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 20px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          transition: all 0.2s;
        }
        .um-step.active { color: var(--green-light); background: rgba(2,132,199,0.1); }
        .um-step.done { color: rgba(2,132,199,0.6); }
        .um-step-dot {
          width: 18px; height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          font-size: 0.6rem;
          font-weight: 700;
        }
        .um-step.active .um-step-dot { border-color: var(--green-light); background: rgba(2,132,199,0.15); }
        .um-step.done .um-step-dot { border-color: rgba(2,132,199,0.4); background: rgba(2,132,199,0.1); color: var(--green-light); }
        .um-step-label { white-space: nowrap; }
        @media (max-width: 500px) {
          .um-step-label { display: none; }
        }
        .um-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          color: #f87171;
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem;
          margin-bottom: 14px;
        }
        .um-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .um-label {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 4px;
        }
        /* --- Dropzone --- */
        .um-dropzone {
          border: 2px dashed rgba(255,255,255,0.1);
          border-radius: 14px;
          padding: 28px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .um-dropzone:hover, .um-dropzone.drag-over {
          border-color: rgba(2, 132, 199, 0.4);
          background: rgba(2, 132, 199, 0.04);
        }
        .um-dropzone.has-file { border-color: rgba(2, 132, 199, 0.25); border-style: solid; }
        .um-file-input { display: none; }
        .um-drop-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.4);
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
        }
        .um-drop-hint { font-size: 0.68rem; color: rgba(255,255,255,0.2); }
        .um-file-mode-hint {
          font-family: 'Outfit', sans-serif;
          font-size: 0.78rem;
          color: rgba(212, 168, 83, 0.85);
          text-align: center;
          padding: 8px 14px;
          background: rgba(218,165,32,0.06);
          border: 1px solid rgba(218,165,32,0.12);
          border-radius: 10px;
        }
        /* --- File list --- */
        .um-file-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 4px;
        }
        .um-file-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px;
          transition: background 0.15s;
        }
        .um-file-item:hover { background: rgba(255,255,255,0.05); }
        .um-file-item-icon { color: var(--green-bright); flex-shrink: 0; }
        .um-file-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .um-file-item-name {
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem;
          color: #e0e0e0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .um-file-item-size {
          font-family: 'Outfit', sans-serif;
          font-size: 0.66rem;
          color: rgba(255,255,255,0.3);
        }
        .um-file-item-remove {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 5px;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: rgba(255,255,255,0.25);
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .um-file-item-remove:hover { background: rgba(239,68,68,0.15); color: #f87171; }
        .um-file-count-summary {
          font-family: 'Outfit', sans-serif;
          font-size: 0.7rem;
          color: rgba(255,255,255,0.3);
          text-align: right;
          padding-top: 4px;
        }
        /* --- Type buttons --- */
        .um-type-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        @media (max-width: 500px) {
          .um-type-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .um-type-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.6);
          font-family: 'Outfit', sans-serif;
          font-size: 0.76rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .um-type-btn:hover { background: rgba(255,255,255,0.05); }
        .um-type-btn.selected { color: #fff; font-weight: 600; }
        .um-exam-row, .um-sem-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .um-pill {
          padding: 6px 12px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.55);
          font-family: 'Outfit', sans-serif;
          font-size: 0.74rem;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .um-pill:hover { background: rgba(255,255,255,0.05); }
        .um-pill.selected {
          background: rgba(2,132,199,0.15);
          border-color: rgba(2,132,199,0.35);
          color: var(--green-light);
          font-weight: 600;
        }
        .um-input, .um-select, .um-textarea {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 10px 14px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          color: #e0e0e0;
          outline: none;
          transition: border-color 0.2s;
        }
        .um-input:focus, .um-select:focus, .um-textarea:focus { border-color: rgba(2, 132, 199, 0.4); }
        .um-input::placeholder, .um-textarea::placeholder { color: rgba(255,255,255,0.2); }
        .um-select { appearance: none; cursor: pointer; }
        .um-select option {
          background: #030a18;
          color: #e0e0e0;
        }
        .um-textarea { resize: vertical; min-height: 50px; }
        /* --- Consent --- */
        .um-consent {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 2px;
        }
        .um-toggle {
          width: 38px; height: 20px;
          border-radius: 10px;
          border: none;
          background: rgba(255,255,255,0.12);
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
          padding: 0;
        }
        .um-toggle.on { background: rgba(2,132,199,0.4); }
        .um-toggle-knob {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.2s;
        }
        .um-toggle.on .um-toggle-knob { transform: translateX(18px); }
        .um-consent-text {
          font-family: 'Outfit', sans-serif;
          font-size: 0.78rem;
          color: rgba(255,255,255,0.5);
        }
        /* --- Preview / Summary --- */
        .um-preview-section { margin-top: 8px; }
        .um-preview-box {
          padding: 8px 14px;
          background: rgba(2,132,199,0.06);
          border: 1px solid rgba(2,132,199,0.15);
          border-radius: 10px;
          font-family: 'Outfit', sans-serif;
          font-size: 0.78rem;
          color: var(--green-light);
          word-break: break-all;
        }
        .um-canonical-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 140px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(2,132,199,0.15) transparent;
        }
        .um-summary {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .um-summary-row {
          display: flex;
          justify-content: space-between;
          font-family: 'Outfit', sans-serif;
          font-size: 0.76rem;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .um-summary-row span:first-child { color: rgba(255,255,255,0.4); }
        .um-summary-row span:last-child { color: rgba(255,255,255,0.7); text-align: right; }
        /* --- Progress --- */
        .um-progress-section {
          margin-top: 14px;
        }
        .um-progress-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .um-progress {
          flex: 1;
          height: 6px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
        }
        .um-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, var(--green-light), #daa520);
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .um-progress-text {
          font-family: 'Outfit', sans-serif;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--green-light);
          min-width: 36px;
          text-align: right;
        }
        .um-upload-status {
          font-family: 'Outfit', sans-serif;
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
          margin-top: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* --- Footer / Nav --- */
        .um-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .um-nav-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.6);
          font-family: 'Outfit', sans-serif;
          font-size: 0.82rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .um-nav-btn:hover { background: rgba(255,255,255,0.06); }
        .um-nav-btn.um-next {
          background: rgba(2, 132, 199, 0.15);
          border-color: rgba(2, 132, 199, 0.25);
          color: var(--green-light);
        }
        .um-nav-btn:disabled, .um-submit-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .um-submit-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #b8860b, #daa520);
          color: #0a0f0a;
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.2s;
        }
        .um-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 18px rgba(218,165,32,0.3);
        }
        .um-spinner { animation: um-spin 1s linear infinite; }
        @keyframes um-spin { to { transform: rotate(360deg); } }
        /* --- Success --- */
        .um-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 30px 0;
          gap: 10px;
          position: relative;
        }
        .um-success-sparkles {
          position: absolute;
          top: 50%;
          left: 50%;
          pointer-events: none;
        }
        .um-sparkle {
          position: absolute;
          color: #daa520;
        }
        .um-success-check {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: rgba(2, 132, 199, 0.15);
          border: 2px solid var(--green-light);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--green-light);
        }
        .um-success h3 {
          font-family: 'Cinzel', serif;
          font-size: 1.4rem;
          color: #f0f0f0;
          margin: 6px 0 0;
        }
        .um-success-file {
          font-family: 'Outfit', sans-serif;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.45);
          word-break: break-all;
        }
        .um-success-btn {
          margin-top: 10px;
          padding: 10px 28px;
          background: linear-gradient(135deg, #b8860b, #daa520);
          color: #0a0f0a;
          font-family: 'Outfit', sans-serif;
          font-size: 0.85rem;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: transform 0.15s;
        }
        .um-success-btn:hover { transform: translateY(-1px); }

        /* --- Mobile Warning Overlay --- */
        .um-warning-overlay {
          position: absolute;
          inset: 0;
          background: rgba(3, 10, 24, 0.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          z-index: 100;
          border-radius: 20px;
        }
        .um-warning-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
          max-width: 380px;
          width: 100%;
          padding: 24px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(218, 165, 32, 0.25);
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .um-warning-title {
          font-family: 'Cinzel', serif;
          font-size: 1.2rem;
          font-weight: 700;
          color: #daa520;
          margin: 0;
        }
        .um-warning-desc {
          font-family: 'Outfit', sans-serif;
          font-size: 0.84rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          margin: 0;
        }
        .um-warning-btn {
          width: 100%;
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 10px 20px;
          background: #daa520;
          color: #030a18;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .um-warning-btn:hover {
          background: #f1b835;
          box-shadow: 0 0 15px rgba(218, 165, 32, 0.35);
        }
      `}</style>
    </>
  );
}
