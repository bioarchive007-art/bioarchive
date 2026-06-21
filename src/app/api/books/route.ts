export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';
import { findSubfolderId, listFilesInFolder } from '@/lib/drive';
import { getAccessToken } from '@/lib/google-auth';
import { apiCache } from '@/lib/api-cache';
import { rateLimit } from '@/lib/rate-limit';

async function listSubfolders(parentFolderId: string): Promise<Array<{ id: string; name: string }>> {
  const token = await getAccessToken();
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.append('q', `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  url.searchParams.append('fields', 'files(id, name)');
  url.searchParams.append('pageSize', '100');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list subfolders: ${res.statusText} - ${text}`);
  }

  const data = await res.json() as { files?: Array<{ id: string; name: string }> };
  return data.files || [];
}

/**
 * GET /api/books
 *
 * Lists all textbook files in the Google Drive folder matching the given semester and courseCode.
 * Results are cached in Cloudflare KV for 5 minutes.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate-limit: 20 requests per IP per minute.
    // This endpoint chains up to 5 Google Drive API calls per cache miss —
    // rate limiting is essential to prevent Drive quota exhaustion.
    const rl = await rateLimit(request, 'books', 20, 60);
    if (!rl.allowed) {
      return NextResponse.json({ error: rl.error }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const semester = searchParams.get('semester') || '';
    const courseCode = searchParams.get('courseCode') || '';

    if (!semester) {
      return NextResponse.json(
        { error: 'Missing required query parameter: semester' },
        { status: 400 }
      );
    }

    const booksDriveFolderId = process.env.BOOKS_DRIVE_FOLDER_ID;
    if (!booksDriveFolderId) {
      // If books folder ID is not configured yet, return empty list instead of crashing
      console.warn('BOOKS_DRIVE_FOLDER_ID is not configured in environment variables.');
      return NextResponse.json([]);
    }

    const cacheKey = courseCode ? `books:${semester}:${courseCode}` : `books:${semester}`;

    // Check cache
    const cached = await apiCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    let targetFolderId = booksDriveFolderId;

    if (courseCode) {
      try {
        // Step 1: Find Core Courses or Advance Courses
        const rootFolders = await listSubfolders(booksDriveFolderId);
        const isAdvance = semester.toUpperCase().includes('ADVANCE');
        const searchTarget = isAdvance ? 'advance' : 'core course';

        const nextFolder = rootFolders.find(f => f.name.toLowerCase().includes(searchTarget));

        if (nextFolder) {
          targetFolderId = nextFolder.id;

          if (!isAdvance) {
            // Step 2: Under Core Courses, find "Sem {semester}"
            const semFolders = await listSubfolders(targetFolderId);
            const semFolder = semFolders.find(f => {
              const nameLower = f.name.toLowerCase().replace(/\s+/g, '');
              const targetLower = semester.toLowerCase();
              return nameLower.includes(`sem${targetLower}`) || nameLower === targetLower || nameLower.includes(targetLower);
            });
            if (semFolder) {
              targetFolderId = semFolder.id;
            } else {
              console.warn(`Semester folder for "${semester}" not found in Core Courses. Fallback to Core Courses.`);
            }
          }

          const courseFolders = await listSubfolders(targetFolderId);
          const normalize = (s: string) => s.toLowerCase().replace(/bio/g, 'b').replace(/[^a-z0-9]/g, '');
          const normalizedCode = normalize(courseCode);
          const courseFolder = courseFolders.find(f =>
            normalize(f.name).includes(normalizedCode)
          );

          if (courseFolder) {
            targetFolderId = courseFolder.id;

            // Find "Books" folder (either directly under the Course folder, or under a "Course Materials" subfolder)
            const courseContent = await listSubfolders(targetFolderId);
            let booksFolder = courseContent.find(f =>
              f.name.toLowerCase().includes('book')
            );

            if (!booksFolder) {
              const materialsFolder = courseContent.find(f =>
                f.name.toLowerCase().includes('course material')
              );
              if (materialsFolder) {
                const materialsContent = await listSubfolders(materialsFolder.id);
                booksFolder = materialsContent.find(f =>
                  f.name.toLowerCase().includes('book')
                );
              }
            }

            if (booksFolder) {
              targetFolderId = booksFolder.id;
            } else {
              console.warn(`Books folder not found. Using target folder: ${targetFolderId}`);
            }
          } else {
            console.warn(`Course folder for "${courseCode}" not found. Fallback to semester folder.`);
          }
        } else {
          console.warn(`Folder matching "${searchTarget}" not found in Archive. Fallback to Archive.`);
        }
      } catch (err) {
        console.error('Error during dynamic directory traversal:', err);
      }
    } else {
      // Legacy fallback search for a semester subfolder (e.g. "1", "2", "ADVANCE COURSES")
      try {
        const subfolderId = await findSubfolderId(booksDriveFolderId, semester);
        if (subfolderId) {
          targetFolderId = subfolderId;
        } else {
          console.info(`No subfolder found matching semester "${semester}". Falling back to parent folder.`);
        }
      } catch (err) {
        console.error('Failed to search for semester subfolder:', err);
      }
    }

    // List files inside the determined folder
    const files = await listFilesInFolder(targetFolderId);

    // Save to cache (5 days = 432000 seconds)
    if (files && files.length > 0) {
      await apiCache.set(cacheKey, files, 432000);
    }

    return NextResponse.json(files);
  } catch (err: any) {
    console.error('[api/books] GET Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

