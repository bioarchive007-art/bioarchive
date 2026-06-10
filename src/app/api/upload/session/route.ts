export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/config';
import { generateRenamedFilename } from '@/lib/file-renaming';
import { createResumableUploadSession } from '@/lib/drive';
import { checkDuplicateMetadata } from '@/lib/sheets';

/**
 * Allowed MIME types for upload validation.
 */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
]);

/**
 * POST /api/upload/session
 *
 * Initialises an upload session: generates the canonical filename,
 * R2 key, and a Google Drive resumable upload URL.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      fileName,
      mimeType,
      fileSize,
      courseCode,
      courseName,
      semester,
      fileType,
      examType,
      year,
      professor,
      professor2,
      professor3,
      uploaderName,
      remarks,
    } = body;

// --- Validation ---
    if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
      return NextResponse.json(
        { error: 'fileName is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const maxBytes = CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (typeof fileSize !== 'number' || fileSize > maxBytes) {
      return NextResponse.json(
        { error: `fileSize exceeds the maximum allowed size of ${CONFIG.MAX_FILE_SIZE_MB} MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `MIME type "${mimeType}" is not allowed. Accepted types: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}` },
        { status: 400 }
      );
    }

    // Step 1: Generate canonical filename
    const canonicalFileName = generateRenamedFilename(fileName, {
      courseCode,
      professor,
      fileType,
      year,
      examType,
    });

    // Check if the metadata fields indicate this file is a duplicate
    const isDuplicateMatch = await checkDuplicateMetadata({
      semester,
      year,
      courseName,
      professor,
      fileType,
      examType,
    });

    // If duplicate, route to quarantine folder, otherwise normal folder
    let folderId = CONFIG.DRIVE_FOLDER_ID;
    if (isDuplicateMatch) {
      const skipQuarantineTypes = new Set(['notes', 'assignment', 'lab']);
      if (!skipQuarantineTypes.has(fileType.toLowerCase())) {
        folderId = CONFIG.DRIVE_QUARANTINE_FOLDER_ID;
      }
    }

    // Step 2: Generate R2 key placeholder (R2 disabled)
    const r2Key = '';

    // Step 3: Create Drive resumable upload session
    const driveUploadUrl = await createResumableUploadSession({
      fileName: canonicalFileName,
      mimeType,
      fileSize,
      folderId,
    });

    // Step 4: Return session data
    return NextResponse.json({
      driveUploadUrl,
      r2Key,
      canonicalFileName,
      metadata: {
        courseCode,
        courseName,
        semester,
        fileType,
        examType: examType || '',
        year,
        professor: professor || '',
        professor2: professor2 || '',
        professor3: professor3 || '',
        uploaderName: uploaderName || '',
        remarks: remarks || '',
        mimeType,
        fileSize,
        isDuplicate: !!isDuplicateMatch,
      },
    });
  } catch (err: any) {
    console.error('[api/upload/session] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
