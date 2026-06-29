export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { appendBookRequestRecord } from '@/lib/sheets';
import { notifyAdminOfBookRequest } from '@/lib/notify';
import { serverError } from '@/lib/errors';
import { fetchWithTimeout } from '@/lib/utils';
import { getAccessToken } from '@/lib/google-auth';
import { verifyGoogleToken, checkIsDev } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const fetch = fetchWithTimeout;

function generateRequestId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function getCourseDriveFolderLink(semester: string, courseCode: string): Promise<{ folderId: string; viewLink: string } | null> {
  try {
    const booksDriveFolderId = process.env.BOOKS_DRIVE_FOLDER_ID;
    if (!booksDriveFolderId) return null;
    const token = await getAccessToken();
    const listSubfolders = async (parentId: string) => {
      const url = new URL('https://www.googleapis.com/drive/v3/files');
      url.searchParams.set('q', `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
      url.searchParams.set('fields', 'files(id, name)');
      url.searchParams.set('pageSize', '100');
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      const data = await res.json() as { files?: Array<{ id: string; name: string }> };
      return data.files || [];
    };
    const isAdvance = semester.toUpperCase().includes('ADVANCE');
    const rootFolders = await listSubfolders(booksDriveFolderId);
    const topFolder = rootFolders.find(f =>
      isAdvance ? f.name.toLowerCase().includes('advance') : f.name.toLowerCase().includes('core course')
    );
    if (!topFolder) return null;
    let targetId = topFolder.id;
    if (!isAdvance) {
      const semFolders = await listSubfolders(targetId);
      const semFolder = semFolders.find(f => {
        const n = f.name.toLowerCase().replace(/\s+/g, '');
        return n.includes(`sem${semester.toLowerCase()}`) || n.includes(semester.toLowerCase());
      });
      if (semFolder) targetId = semFolder.id;
    }
    const normalize = (s: string) => s.toLowerCase().replace(/bio/g, 'b').replace(/[^a-z0-9]/g, '');
    const courseFolders = await listSubfolders(targetId);
    const courseFolder = courseFolders.find(f => normalize(f.name).includes(normalize(courseCode)));
    if (!courseFolder) return null;
    const courseContents = await listSubfolders(courseFolder.id);
    let booksFolder = courseContents.find(f => f.name.toLowerCase().includes('book'));
    if (!booksFolder) {
      const matFolder = courseContents.find(f => f.name.toLowerCase().includes('course material'));
      if (matFolder) {
        const matContents = await listSubfolders(matFolder.id);
        booksFolder = matContents.find(f => f.name.toLowerCase().includes('book'));
      }
    }
    const folderId = booksFolder?.id || courseFolder.id;
    return { folderId, viewLink: `https://drive.google.com/drive/folders/${folderId}` };
  } catch {
    return null;
  }
}

async function getDriveFileViewLink(fileId: string): Promise<string> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return `https://drive.google.com/file/d/${fileId}/view`;
    const data = await res.json() as { webViewLink?: string };
    return data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
  } catch {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit(request, 'books-request', 5, 300);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const body = await request.json() as {
      token?: string;           // Google ID token from signed-in user
      semester?: string;
      courseCode?: string;
      courseName?: string;
      bookName?: string;
      driveFileId?: string;
      isNewBook?: boolean;
      author?: string;
      edition?: string;
    };

    const { token: idToken, semester, courseCode, courseName, bookName, driveFileId, isNewBook, author, edition } = body;

    // Require a valid Google sign-in token
    if (!idToken) {
      return NextResponse.json({ error: 'Authentication required. Please sign in with your NISER account.' }, { status: 401 });
    }

    const googleUser = await verifyGoogleToken(idToken);
    const email = googleUser.email;
    const name = googleUser.name || email.split('@')[0];

    // Validate NISER domain
    const isDev = checkIsDev() || request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1';
    const isNiser = email.toLowerCase().endsWith('@niser.ac.in');
    const isGmail = email.toLowerCase().endsWith('@gmail.com');
    const isBioarchive = email.toLowerCase() === 'bioarchive007@gmail.com' || email.toLowerCase().startsWith('bioarchive007@');
    if (!isNiser && !isBioarchive && !(isDev && isGmail)) {
      return NextResponse.json({ error: 'Only @niser.ac.in institutional accounts can request books.' }, { status: 403 });
    }

    if (!semester || !courseCode || !bookName) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (isNewBook && !author) {
      return NextResponse.json({ error: 'Author name is required for new book requests.' }, { status: 400 });
    }

    const requestId = generateRequestId();
    const timestamp = new Date().toISOString();
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    let driveFolderLink: string | undefined;
    let driveViewLink = '';

    if (isNewBook) {
      const folderInfo = await getCourseDriveFolderLink(semester, courseCode);
      driveFolderLink = folderInfo?.viewLink;
    } else if (driveFileId) {
      driveViewLink = await getDriveFileViewLink(driveFileId);
    }

    await appendBookRequestRecord({
      requestId,
      timestamp,
      name,
      email,
      semester,
      courseCode,
      courseName: courseName || courseCode,
      bookName,
      driveFileId: driveFileId || '',
      driveViewLink,
      isNewBook: !!isNewBook,
      author: author || '',
      edition: edition || '',
      status: 'Pending',
      allowedAt: '',
      expiresAt: '',
    });

    await notifyAdminOfBookRequest({
      requestId,
      name,
      email,
      semester,
      courseCode,
      courseName: courseName || courseCode,
      bookName,
      isNewBook: !!isNewBook,
      author,
      edition,
      driveFileId: driveFileId || undefined,
      driveFolderLink,
      baseUrl,
    });

    return NextResponse.json({ success: true, requestId });
  } catch (err: any) {
    console.error('[api/books/request] POST Error:', err);
    return NextResponse.json(
      { error: serverError(err, 'Failed to submit book request. Please try again.') },
      { status: 500 }
    );
  }
}
