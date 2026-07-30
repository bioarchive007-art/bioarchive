export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { CONFIG } from '@/config';
import { generateRenamedFilename } from '@/lib/file-renaming';
import { createResumableUploadSession, resolveNestedFolder } from '@/lib/drive';
import { checkDuplicateMetadata, getSiteConfig } from '@/lib/sheets';
import { verifyGoogleToken, isAdminEmail } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';
import { serverError } from '@/lib/errors';

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
  'image/jpeg',
  'application/vnd.ms-powerpoint',
]);

/**
 * POST /api/upload/session
 *
 * Initialises an upload session: generates the canonical filename,
 * R2 key, and a Google Drive resumable upload URL.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate-limit: 40 upload sessions per IP per 10 minutes.
    // Protects Google Drive API quota from bot-driven session flooding.
    const rl = await rateLimit(request, 'upload-session', 40, 600);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

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
      authorName,
      authorBatch,
      contentScope,
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

    const parsedYear = parseInt(year, 10);
    const currentYear = new Date().getFullYear();
    if (!year || isNaN(parsedYear) || !/^\d{4}$/.test(year.toString().trim()) || parsedYear > currentYear) {
      return NextResponse.json(
        { error: `Invalid year. Future years or non-4-digit years are not allowed. (Current year is ${currentYear})` },
        { status: 400 }
      );
    }

    // Step 1: Generate canonical filename
    const siteConfig: Record<string, boolean> = await getSiteConfig().catch(() => ({ renameFiles: true, enableUploads: true, requireModeration: true }));
    if (siteConfig.enableUploads === false) {
      return NextResponse.json({ error: 'Uploads are currently disabled by the administrator.' }, { status: 403 });
    }


    const canonicalFileName = siteConfig.renameFiles
      ? generateRenamedFilename(fileName, {
          courseCode,
          professor,
          fileType,
          year,
          examType,
        })
      : fileName;

    // Check if the metadata fields indicate this file is a duplicate
    const isDuplicateMatch = await checkDuplicateMetadata({
      semester,
      year,
      courseName,
      professor,
      fileType,
      examType,
    });

    // Determine target upload folder based on requireModeration feature toggle
    let folderId = CONFIG.DRIVE_QUARANTINE_FOLDER_ID;
    const status = siteConfig.requireModeration ? 'pending_approval' : 'approved';

    if (!siteConfig.requireModeration) {
      try {
        const isAdvance = semester.toUpperCase().includes('ADVANCE');
        const courseCategory = isAdvance ? 'Adv Courses' : 'Core Courses';

        const pathComponents = [courseCategory];
        if (!isAdvance) {
          pathComponents.push(`Sem ${semester}`);
        }
        pathComponents.push(`${courseCode.trim()} ${courseName.trim()}`);

        const FILE_TYPE_FOLDERS: Record<string, string> = {
          qpaper: 'Question Papers',
          notes: 'Notes',
          slides: 'Slides',
          lab: 'Lab Material',
          assignment: 'Assignments',
          other: 'Other',
        };
        const folderName = FILE_TYPE_FOLDERS[fileType.toLowerCase()] || 'Other';
        pathComponents.push(folderName);
        pathComponents.push(professor.trim());

        // Resolve or create nested path in Google Drive directly
        folderId = await resolveNestedFolder(CONFIG.DRIVE_FOLDER_ID, pathComponents);
      } catch (err) {
        console.error('[api/upload/session] Failed to resolve subfolders for direct upload:', err);
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
        authorName: authorName || '',
        authorBatch: authorBatch || '',
        contentScope: contentScope || '',
        remarks: remarks || '',
        mimeType,
        fileSize,
        isDuplicate: !!isDuplicateMatch,
        status,
      },
    });
  } catch (err: any) {
    console.error('[api/upload/session] Error:', err);
    return NextResponse.json(
      { error: serverError(err, 'Failed to create upload session. Please try again.') },
      { status: 500 }
    );
  }
}
