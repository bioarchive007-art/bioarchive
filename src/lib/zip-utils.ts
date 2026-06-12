import { CONFIG } from '@/config';
import { SheetRow } from '@/types';
import { getAllFiles, deleteFileRecord, appendFileRecord } from './sheets';
import { deleteFromDrive, uploadToDrive, makeFilePublic, resolveNestedFolder } from './drive';
import { getAccessToken } from './google-auth';
import JSZip from 'jszip';
import { getRequestContext } from '@cloudflare/next-on-pages';

/**
 * Rebuilds the combined ZIP archive for a specific course material category.
 * If there is 0 or 1 individual files, any existing ZIP archive is deleted.
 * If there are 2 or more files, a new ZIP archive is built, uploaded, and registered,
 * while any previous ZIP archive is deleted.
 */
export async function rebuildZipArchive(params: {
  courseCode: string;
  semester: string;
  year: string;
  fileType: string;
  professor: string;
  uploaderName?: string;
}): Promise<void> {
  const { courseCode, semester, year, fileType, professor } = params;

  // 1. Get all files matching this course category
  const allFiles = await getAllFiles();
  const matchingFiles = allFiles.filter(file => 
    file.courseCode.toLowerCase() === courseCode.toLowerCase() &&
    file.semester.toString() === semester.toString() &&
    file.year.toString() === year.toString() &&
    file.fileType.toLowerCase() === fileType.toLowerCase() &&
    file.professor.toLowerCase() === professor.toLowerCase()
  );

  // 2. Separate individual files and previous ZIP files
  const individualFiles = matchingFiles.filter(f => !f.fileName.toLowerCase().endsWith('_all_files.zip'));
  const previousZipFiles = matchingFiles.filter(f => f.fileName.toLowerCase().endsWith('_all_files.zip'));

  // 3. Delete any previous ZIP files from Google Drive and Sheet registry
  for (const zipFile of previousZipFiles) {
    try {
      await deleteFromDrive(zipFile.driveFileId);
    } catch (err) {
      console.error(`Failed to delete previous ZIP file ${zipFile.fileName} from Drive:`, err);
    }
    try {
      await deleteFileRecord(zipFile.fileId);
    } catch (err) {
      console.error(`Failed to delete previous ZIP record ${zipFile.fileName} from Sheet:`, err);
    }
  }

  // 4. If there are > 1 individual files, create a new ZIP archive
  if (individualFiles.length > 1) {
    console.log(`[zip-utils] Rebuilding ZIP archive for ${individualFiles.length} files...`);
    const zip = new JSZip();
    const token = await getAccessToken();

    for (const file of individualFiles) {
      try {
        const driveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.driveFileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (driveRes.ok) {
          const buffer = await driveRes.arrayBuffer();
          zip.file(file.fileName, buffer);
        } else {
          console.error(`[zip-utils] Failed to download file ${file.fileName} for zipping: ${driveRes.statusText}`);
        }
      } catch (err) {
        console.error(`[zip-utils] Error downloading file ${file.fileName} for zipping:`, err);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });
    const zipName = `${courseCode}_${semester}_${year}_${fileType}_all_files.zip`;
    
    // Resolve nested folder path for the ZIP archive
    let folderId = CONFIG.DRIVE_FOLDER_ID;
    try {
      const isAdvance = semester.toUpperCase().includes('ADVANCE');
      const courseCategory = isAdvance ? 'Adv Courses' : 'Core Courses';
      
      const pathComponents = [courseCategory];
      if (!isAdvance) {
        pathComponents.push(`Sem ${semester}`);
      }
      const courseName = individualFiles[0].courseName;
      pathComponents.push(`${courseCode.trim()} ${courseName.trim()}`);
      pathComponents.push('Course Materials');

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

      folderId = await resolveNestedFolder(CONFIG.DRIVE_FOLDER_ID, pathComponents);
    } catch (err) {
      console.error('[zip-utils] Failed to resolve subfolder structure for ZIP, using root:', err);
    }

    // Upload the new ZIP to Google Drive
    const uploadResult = await uploadToDrive({
      fileName: zipName,
      mimeType: 'application/zip',
      buffer: zipBuffer,
      folderId: folderId
    });

    // Share the new ZIP
    await makeFilePublic(uploadResult.fileId);

    // Register the new ZIP in the Sheets registry
    const newFileId = crypto.randomUUID();
    const zipRow: SheetRow = {
      fileId: newFileId,
      r2Key: '',
      driveFileId: uploadResult.fileId,
      semester,
      year,
      courseCode,
      courseName: individualFiles[0].courseName,
      professor,
      professor2: individualFiles[0].professor2 || '',
      professor3: individualFiles[0].professor3 || '',
      examType: individualFiles[0].examType || '',
      fileType,
      fileName: zipName,
      uploaderName: params.uploaderName || 'System',
      uploadDate: new Date().toISOString().split('T')[0],
      md5Hash: '',
      r2Url: '',
      driveWebViewLink: uploadResult.webViewLink,
      downloadCount: 0,
      remarks: 'Automatically compiled archive',
    };

    await appendFileRecord(zipRow, false);
    console.log(`[zip-utils] Successfully registered new ZIP archive: ${zipName}`);
  }
}

/**
 * Triggers the rebuild of a course category ZIP archive in the background.
 * It is non-blocking and integrates with Cloudflare context.waitUntil if available.
 */
export function triggerBackgroundZipRebuild(params: {
  courseCode: string;
  semester: string;
  year: string;
  fileType: string;
  professor: string;
  uploaderName?: string;
}): void {
  const rebuildPromise = rebuildZipArchive(params).catch((err) =>
    console.error('[background-zip-rebuild] Failed to rebuild ZIP archive:', err)
  );

  try {
    const cloudflareCtx = getRequestContext();
    if (cloudflareCtx && cloudflareCtx.ctx && typeof cloudflareCtx.ctx.waitUntil === 'function') {
      cloudflareCtx.ctx.waitUntil(rebuildPromise);
      console.log('[background-zip-rebuild] Registered rebuildZipArchive in Cloudflare ctx.waitUntil');
    } else {
      console.log('[background-zip-rebuild] Cloudflare ctx.waitUntil not available, running as standard background promise');
    }
  } catch (e) {
    console.log('[background-zip-rebuild] Running rebuildZipArchive as standard background promise');
  }
}

