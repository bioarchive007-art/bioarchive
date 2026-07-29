import { getProfessorAcronym } from './utils';

/**
 * Sanitize a string for traditional naming (PascalCase / Title Case)
 */
export function toTraditionalCase(str: string): string {
  if (!str) return '';

  const knownAcronyms = new Set([
    'DNA', 'RNA', 'PCR', 'ATP', 'ADP', 'AMP', 'NMR', 'HPLC', 'GC',
    'MS', 'ES', 'UV', 'IR', 'TCA', 'ECG', 'EEG', 'EMG', 'ELISA',
  ]);

  return str
    .trim()
    .replace(/[^\w\s\-]/g, '')
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .map((word) => {
      const upper = word.toUpperCase();
      if (knownAcronyms.has(upper)) return upper;
      if (/^[A-Z]*\d+[A-Z0-9]*$/i.test(word)) return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Standardize exam type: MID_SEMESTER -> MS, END_SEMESTER -> ES
 */
export function formatExamType(examType?: string): string {
  if (!examType) return '';
  const clean = examType.trim().toLowerCase().replace(/[\s_\-]+/g, '_');
  if (clean === 'mid_semester' || clean === 'midsemester' || clean === 'mid' || clean === 'ms') {
    return 'MS';
  }
  if (clean === 'end_semester' || clean === 'endsemester' || clean === 'end' || clean === 'es') {
    return 'ES';
  }
  return toTraditionalCase(examType);
}

/**
 * Standardize file category labels: qpaper -> QPaper, assignment -> Asgn, etc.
 */
export function formatFileTypeLabel(fileType: string): string {
  const clean = (fileType || '').trim().toLowerCase();
  if (clean === 'qpaper' || clean === 'question paper' || clean === 'question_paper') return 'QPaper';
  if (clean === 'notes') return 'Notes';
  if (clean === 'slides') return 'Slides';
  if (clean === 'lab' || clean === 'lab_materials') return 'Lab';
  if (clean === 'assignment' || clean === 'asgn') return 'Asgn';
  return 'Other';
}

/**
 * Sanitize a string for use in filenames while maintaining upper case where needed
 */
export function sanitizeForFilename(str: string): string {
  return str
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Extract file extension from filename
 */
function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.[^/.]+$/);
  return match ? match[0] : '';
}

/**
 * Generate renamed filename based on file type and metadata using acronyms and traditional casing
 */
export function generateRenamedFilename(
  originalFileName: string,
  metadata: {
    courseCode: string;
    professor: string;
    fileType: string;
    year: string;
    examType?: string;
  }
): string {
  const extension = getFileExtension(originalFileName);
  const courseCode = metadata.courseCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Use professor acronym for filename (e.g. AR, TKC)
  const profAcronym = getProfessorAcronym(metadata.professor);

  // Traditional file type label (e.g. QPaper, Notes, Slides, Lab, Asgn)
  const fileTypeStr = formatFileTypeLabel(metadata.fileType);

  const year = metadata.year.trim();

  let suffix = '';
  if (originalFileName.toLowerCase().includes('_all_files')) {
    suffix = '_AllFiles';
  }

  let newName = '';
  if (metadata.fileType.toLowerCase() === 'qpaper' && metadata.examType) {
    const examTypeStr = formatExamType(metadata.examType);
    newName = `${courseCode}_${profAcronym}_${fileTypeStr}_${year}_${examTypeStr}${suffix}`;
  } else {
    const dotIndex = originalFileName.lastIndexOf('.');
    const originalNameWithoutExt = dotIndex !== -1 ? originalFileName.substring(0, dotIndex) : originalFileName;

    // Clean up original filename if it already contains old prefix patterns (e.g. B202_, DR_REHMAN_, NOTES_, 2024_, etc.)
    let cleanTopic = originalNameWithoutExt
      .replace(/^B\d{3}_/i, '')
      .replace(/^(DR_[A-Z_]+|DR[A-Z_]+|PROF_[A-Z_]+)_/i, '')
      .replace(/^(NOTES|SLIDES|QPAPER|LAB|ASSIGNMENT|ASGN)_/i, '')
      .replace(/^\d{4}_/i, '')
      .replace(/_\d{2}_\d{2}_\d{4}$/, '')
      .replace(/_AllFiles$/i, '');

    // Convert topic to traditional case (PascalCase / Title Case, not all caps)
    let traditionalTopic = toTraditionalCase(cleanTopic);
    if (traditionalTopic.length > 50) {
      traditionalTopic = traditionalTopic.substring(0, 50);
    }
    const topicPart = traditionalTopic ? `_${traditionalTopic}` : '';
    newName = `${courseCode}_${profAcronym}_${fileTypeStr}_${year}${topicPart}${suffix}`;
  }

  return newName + extension;
}

/**
 * Validate filename doesn't exceed limits (max 200 chars for Drive compatibility)
 */
export function isValidFileName(fileName: string, maxLength: number = 200): boolean {
  return fileName.length > 0 && fileName.length <= maxLength;
}

/**
 * Format metadata for renaming - helper for API calls
 */
export function formatMetadataForRenaming(metadata: {
  courseCode: string;
  courseName: string;
  fileType: string;
  year: string;
  examType?: string;
}) {
  return {
    courseCode: metadata.courseCode.trim(),
    courseName: metadata.courseName.trim(),
    fileType: metadata.fileType.trim(),
    year: metadata.year.trim(),
    examType: metadata.examType?.trim(),
  };
}

