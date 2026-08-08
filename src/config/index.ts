// Server-only IDs — NEXT_PUBLIC_* fallbacks intentionally removed to prevent
// these values from leaking into the client-side JS bundle.
const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID || '';
const DRIVE_QUARANTINE_FOLDER_ID = process.env.DRIVE_QUARANTINE_FOLDER_ID || '';
const BACKUP_DRIVE_FOLDER_ID = process.env.BACKUP_DRIVE_FOLDER_ID || '';
const SHEET_ID = process.env.SHEET_ID || '';
// R2 public URL and Google Client ID are legitimately public-facing values.
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export const CONFIG = Object.freeze({
  GOOGLE_CLIENT_ID,
  DRIVE_FOLDER_ID,
  DRIVE_QUARANTINE_FOLDER_ID,
  BACKUP_DRIVE_FOLDER_ID,
  SHEET_ID,
  R2_PUBLIC_BASE_URL,
  NISER_SEMESTERS: [1, 2, 3, 4, 5, 6, 7, 8] as const,
  ALLOWED_FILE_TYPES: ['pdf', 'ppt', 'pptx', 'docx', 'xlsx', 'zip', 'jpg', 'jpeg', 'png'] as const,
  FILE_CATEGORIES: {
    qpaper: { label: 'Question Paper', emoji: '', colorHex: '#EF4444' },
    notes: { label: 'Notes', emoji: '', colorHex: '#3B82F6' },
    slides: { label: 'Slides', emoji: '', colorHex: '#F59E0B' },
    lab: { label: 'Lab Material', emoji: '', colorHex: '#10B981' },
    assignment: { label: 'Assignment', emoji: '', colorHex: '#8B5CF6' },
    book: { label: 'Reference Book', emoji: '📚', colorHex: '#EC4899' },
    other: { label: 'Other', emoji: '', colorHex: '#6B7280' },
  } as const,
  SHEET_HEADERS: [
    'fileId',
    'r2Key',
    'driveFileId',
    'semester',
    'year',
    'courseCode',
    'courseName',
    'professor',
    'professor2',
    'professor3',
    'examType',
    'fileType',
    'fileName',
    'uploaderName',
    'uploadDate',
    'md5Hash',
    'r2Url',
    'driveWebViewLink',
    'downloadCount',
    'remarks',
    'status',
    'contentScope',
    'authorName',
    'authorBatch'
  ] as const,
  MAX_FILE_SIZE_MB: 500,
});
