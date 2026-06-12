import { SheetRow } from '@/types';

/**
 * Client-side API wrapper for BioArchive backend routes.
 * All functions call the edge API routes created in Part 3.
 */

export async function fetchFilesByCourse(
  courseCode: string,
  semester: string
): Promise<SheetRow[]> {
  const params = new URLSearchParams({ courseCode, semester });
  const res = await fetch(`/api/files?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch files');
  }
  return res.json();
}

export async function incrementFileDownloads(fileId: string): Promise<void> {
  fetch('/api/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  }).catch(() => {
    // fire-and-forget
  });
}

export interface UploadSessionParams {
  fileName: string;
  mimeType: string;
  fileSize: number;
  courseCode: string;
  courseName: string;
  semester: string;
  fileType: string;
  examType?: string;
  year: string;
  professor: string;
  professor2?: string;
  professor3?: string;
  uploaderName: string;
  remarks?: string;
}

export interface UploadSessionResult {
  driveUploadUrl: string;
  r2Key: string;
  canonicalFileName: string;
  metadata: {
    semester: string;
    year: string;
    courseCode: string;
    courseName: string;
    professor: string;
    professor2?: string;
    professor3?: string;
    examType: string;
    fileType: string;
    uploaderName: string;
    remarks?: string;
    mimeType: string;
    fileSize: number;
  };
}

export async function createUploadSession(
  params: UploadSessionParams
): Promise<UploadSessionResult> {
  const res = await fetch('/api/upload/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create upload session');
  }
  return res.json();
}

export interface ConfirmUploadParams {
  driveFileId: string;
  r2Key: string;
  canonicalFileName: string;
  fileBuffer?: string; // base64
  mimeType: string;
  isLastFile?: boolean;
  batchFiles?: string[];
  metadata: {
    semester: string;
    year: string;
    courseCode: string;
    courseName: string;
    professor: string;
    professor2?: string;
    professor3?: string;
    examType: string;
    fileType: string;
    uploaderName: string;
    remarks?: string;
    driveWebViewLink?: string;
    md5Hash?: string;
    requestId?: string;
  };
}

export interface ConfirmUploadResult {
  success?: boolean;
  fileName?: string;
  error?: string;
  existingFile?: { fileName: string; uploadDate: string };
}

export async function confirmUpload(
  params: ConfirmUploadParams
): Promise<ConfirmUploadResult> {
  const res = await fetch('/api/upload/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok && res.status !== 409) {
    const errText = await res.text().catch(() => 'Unknown error');
    let errMsg = `Server returned status ${res.status}`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.error || errMsg;
    } catch {
      if (errText.includes('<title>')) {
        const titleMatch = errText.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) errMsg = `Server Error: ${titleMatch[1]}`;
      }
    }
    throw new Error(errMsg);
  }

  const data = await res.json();
  return data;
}


