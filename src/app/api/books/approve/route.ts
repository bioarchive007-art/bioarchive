export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { getBookRequestById, updateBookRequestStatus } from '@/lib/sheets';
import { notifyUserOfBookApproval, notifyUserOfBookDenial } from '@/lib/notify';
import { makeFilePublic } from '@/lib/drive';
import { getAccessToken } from '@/lib/google-auth';
import { fetchWithTimeout } from '@/lib/utils';

const fetch = fetchWithTimeout;

async function findBookInFolder(folderId: string, bookName: string): Promise<{ id: string; name: string; webViewLink: string } | null> {
  try {
    const token = await getAccessToken();
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`);
    url.searchParams.set('fields', 'files(id, name, webViewLink, createdTime)');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('orderBy', 'createdTime desc');
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const data = await res.json() as { files?: Array<{ id: string; name: string; webViewLink: string; createdTime: string }> };
    const files = data.files || [];
    if (files.length === 0) return null;
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const targetWords = clean(bookName).split(/\s+/).filter(w => w.length > 3);
    const scored = files.map(f => {
      const fn = clean(f.name);
      const matches = targetWords.filter(w => fn.includes(w)).length;
      return { file: f, score: matches };
    }).sort((a, b) => b.score - a.score);
    return scored[0].score >= 2 ? scored[0].file : files[0];
  } catch {
    return null;
  }
}

async function findBooksFolderId(semester: string, courseCode: string): Promise<string | null> {
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
      const d = await res.json() as { files?: Array<{ id: string; name: string }> };
      return d.files || [];
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
    return booksFolder?.id || courseFolder.id;
  } catch {
    return null;
  }
}

function htmlResponse(title: string, message: string, color: string): Response {
  const icon = color === '#10b981' ? '✅' : color === '#ef4444' ? '❌' : 'ℹ️';
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title} — BioArchive</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body { margin:0; background:#030a18; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:'Outfit',sans-serif; }
        .card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:48px 40px; max-width:460px; text-align:center; box-shadow:0 8px 40px rgba(0,0,0,0.4); }
        .icon { font-size:3rem; margin-bottom:16px; }
        h1 { color:${color}; font-size:1.4rem; margin:0 0 12px; }
        p { color:rgba(255,255,255,0.65); line-height:1.7; font-size:0.9rem; margin:0 0 12px; }
        .badge { display:inline-block; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:4px 12px; font-size:0.72rem; color:rgba(255,255,255,0.4); margin-top:8px; }
        a { color:#10b981; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="badge">BioArchive · NISER</div>
      </div>
    </body>
    </html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const requestId = searchParams.get('id') || '';
  const action = searchParams.get('action') || '';

  if (!requestId || !['allow', 'deny'].includes(action)) {
    return htmlResponse('Invalid Request', 'The approval link is invalid or has expired.', '#f59e0b');
  }

  try {
    const req = await getBookRequestById(requestId);
    if (!req) {
      return htmlResponse('Not Found', 'This book request could not be found in the registry.', '#f59e0b');
    }

    if (req.status !== 'Pending') {
      return htmlResponse('Already Processed', `This request was already ${req.status.toLowerCase()} earlier.`, '#f59e0b');
    }

    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const myBooksUrl = `${baseUrl}/my-books`;

    if (action === 'deny') {
      await updateBookRequestStatus(requestId, 'Denied');
      await notifyUserOfBookDenial({ name: req.name, email: req.email, bookName: req.bookName });
      return htmlResponse('Request Denied', `The book request from ${req.name} has been denied and they have been notified.`, '#ef4444');
    }

    // Allow action — resolve Drive file
    let driveViewLink = req.driveViewLink;
    let driveFileId = req.driveFileId;

    if (!driveViewLink && req.isNewBook) {
      const folderId = await findBooksFolderId(req.semester, req.courseCode);
      if (folderId) {
        const found = await findBookInFolder(folderId, req.bookName);
        if (found) {
          driveFileId = found.id;
          driveViewLink = found.webViewLink || `https://drive.google.com/file/d/${found.id}/view`;
        }
      }
    }

    if (!driveViewLink && driveFileId) {
      driveViewLink = `https://drive.google.com/file/d/${driveFileId}/view`;
    }

    if (!driveViewLink) {
      return htmlResponse(
        'Book Not Found Yet',
        `The book "${req.bookName}" could not be found in the Drive folder yet.<br>Upload it to the correct Books folder first, then click Allow again.`,
        '#f59e0b'
      );
    }

    // Make the Drive file accessible to anyone with link
    if (driveFileId) {
      await makeFilePublic(driveFileId);
    }

    await updateBookRequestStatus(requestId, 'Allowed', driveFileId, driveViewLink);

    // Calculate expiresAt (same logic as in updateBookRequestStatus)
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    await notifyUserOfBookApproval({
      name: req.name,
      email: req.email,
      bookName: req.bookName,
      courseCode: req.courseCode,
      myBooksUrl,
      expiresAt,
    });

    return htmlResponse(
      'Request Approved!',
      `The book "<strong>${req.bookName}</strong>" is now available to <strong>${req.name}</strong>.<br>They have been emailed a link to their My Book Library.`,
      '#10b981'
    );
  } catch (err: any) {
    console.error('[api/books/approve] Error:', err);
    return htmlResponse('Server Error', 'An error occurred while processing this request. Please try again.', '#ef4444');
  }
}
