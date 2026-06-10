/**
 * File Renaming Utility for BioArchive
 * Renames uploaded files according to consistent naming convention
 * 
 * Pattern:
 * - Question Papers: COURSECODE_COURSENAME_qpaper_YEAR_EXAMTYPE
 * - Other types:    COURSECODE_COURSENAME_FILETYPE_YEAR
 */

/**
 * Sanitize a string for use in filenames
 * - Removes special characters
 * - Converts to uppercase
 * - Replaces spaces with underscores
 */
export function sanitizeForFilename(str: string): string {
  return str
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[^\w\-]/g, '')        // Remove special characters except hyphens
    .replace(/_+/g, '_')            // Collapse multiple underscores
    .replace(/^_+|_+$/g, '');       // Remove leading/trailing underscores
}

/**
 * Extract file extension from filename
 */
function getFileExtension(fileName: string): string {
  const match = fileName.match(/\.[^/.]+$/);
  return match ? match[0] : '';
}

/**
 * Extract first name with Dr. prefix for professor names
 */
export function getShortProfessorName(profName: string): string {
  if (!profName) return '';
  // Remove common prefixes like Dr., Prof., etc. (case-insensitive)
  let clean = profName.replace(/^(Dr\.|Prof\.|Dr|Prof)\s+/i, '').trim();
  // Get the first word (first name)
  const parts = clean.split(/[\s._-]+/);
  const lastName = parts[1] || '';
  return `Dr. ${lastName}`;
}

/**
 * Generate renamed filename based on file type and metadata
 */
export function generateRenamedFilename(
  originalFileName: string,
  metadata: {
    courseCode: string;
    professor: string;
    fileType: string;
    year: string;
    examType?: string;  // Only for qpaper type
  }
): string {
  const extension = getFileExtension(originalFileName);

  const courseCode = sanitizeForFilename(metadata.courseCode);

  // Use shortened professor name
  const shortProf = getShortProfessorName(metadata.professor);
  const professorName = sanitizeForFilename(shortProf);

  // Use abbreviation for assignment
  let fileType = sanitizeForFilename(metadata.fileType);
  if (fileType.toLowerCase() === 'assignment') {
    fileType = 'ASGN';
  }

  const year = metadata.year.trim();

  let newName = '';
  let suffix = '';
  if (originalFileName.toLowerCase().includes('_all_files')) {
    suffix = '_ALL_FILES';
  }

  // Get current date in dd_mm_yyyy format (representing dd/mm/yyyy without forbidden slashes)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = now.getFullYear();
  const dateStr = `${day}_${month}_${yearStr}`;

  // Build name based on file type
  if (metadata.fileType.toLowerCase() === 'qpaper' && metadata.examType) {
    const examType = sanitizeForFilename(metadata.examType);
    newName = `${courseCode}_${professorName}_${fileType}_${year}_${examType}${suffix}_${dateStr}`;
  } else {
    newName = `${courseCode}_${professorName}_${fileType}_${year}${suffix}_${dateStr}`;
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
