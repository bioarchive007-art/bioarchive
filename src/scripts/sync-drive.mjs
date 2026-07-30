import fs from 'fs';
import path from 'path';

// Read .env.local file to ensure credentials are available
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, 'utf8');
  for (const line of envText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SHEET_ID = process.env.SHEET_ID;
const ROOT_DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !SHEET_ID || !ROOT_DRIVE_FOLDER_ID) {
  console.error("Error: Missing Google API credentials in .env.local!");
  process.exit(1);
}

const isExecute = process.argv.includes('--execute');
console.log(`\n======================================================`);
console.log(` BIOARCHIVE GOOGLE DRIVE SYNC & REORGANIZATION TOOL`);
console.log(` MODE: ${isExecute ? '⚡ EXECUTE MODE (Applying live changes)' : '🔍 DRY RUN MODE (Audit only, no live changes)'}`);
console.log(`======================================================\n`);

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.statusText} - ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

let token = '';

async function fetchWithAuth(url, options = {}) {
  options.headers = options.headers || {};
  options.headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, options);
}

async function getSubfolders(parentFolderId) {
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.append('q', `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  url.searchParams.append('fields', 'files(id, name)');
  url.searchParams.append('pageSize', '100');

  const res = await fetchWithAuth(url.toString());
  if (!res.ok) {
    throw new Error(`Failed to list subfolders: ${res.statusText} - ${await res.text()}`);
  }
  const data = await res.json();
  return data.files || [];
}

async function createFolder(parentFolderId, folderName) {
  if (!isExecute) {
    console.log(`   [DRY RUN WOULD CREATE FOLDER]: "${folderName}" inside parent "${parentFolderId}"`);
    return `mock-folder-id-${Date.now()}`;
  }
  const res = await fetchWithAuth('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    })
  });
  if (!res.ok) {
    throw new Error(`Failed to create folder "${folderName}": ${res.statusText} - ${await res.text()}`);
  }
  const data = await res.json();
  return data.id;
}

function normalizeFolderName(s) {
  return s.toLowerCase()
    .replace(/bio(\d{3})/g, 'b$1')
    .replace(/b(\d{3})\s*\(b\d{3}\)/g, 'b$1')
    .replace(/[^a-z0-9]/g, '');
}

async function resolveNestedFolder(rootFolderId, pathComponents) {
  let currentFolderId = rootFolderId;
  for (const component of pathComponents) {
    if (!component) continue;
    const subfolders = await getSubfolders(currentFolderId);
    const normalizedComp = normalizeFolderName(component);
    const match = subfolders.find(f => normalizeFolderName(f.name) === normalizedComp);
    let folderId = match?.id || null;
    if (!folderId) {
      folderId = await createFolder(currentFolderId, component);
    }
    currentFolderId = folderId;
  }
  return currentFolderId;
}

async function getDriveFileMetadata(driveFileId) {
  const res = await fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=id,name,parents`);
  if (!res.ok) {
    throw new Error(`Drive metadata lookup failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

async function renameDriveFile(driveFileId, newName) {
  const res = await fetchWithAuth(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName })
  });
  if (!res.ok) {
    throw new Error(`Drive rename failed (${res.status}): ${await res.text()}`);
  }
}

async function moveDriveFile(driveFileId, destFolderId, currentParentsStr) {
  const patchUrl = new URL(`https://www.googleapis.com/drive/v3/files/${driveFileId}`);
  patchUrl.searchParams.append('addParents', destFolderId);
  if (currentParentsStr) {
    patchUrl.searchParams.append('removeParents', currentParentsStr);
  }
  const res = await fetchWithAuth(patchUrl.toString(), { method: 'PATCH' });
  if (!res.ok) {
    throw new Error(`Drive move failed (${res.status}): ${await res.text()}`);
  }
}

async function getAllSheetRows() {
  // First get header row to map columns
  const headerRes = await fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!1:1`);
  if (!headerRes.ok) {
    throw new Error(`Failed to read header row: ${headerRes.statusText}`);
  }
  const headerData = await headerRes.json();
  const headers = headerData.values?.[0] || [];
  const headerMap = {};
  headers.forEach((h, i) => { headerMap[h] = i; });

  const lastColLetter = String.fromCharCode(65 + Math.max(headers.length - 1, 20));
  const dataRes = await fetchWithAuth(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A2:${lastColLetter}2000`);
  if (!dataRes.ok) {
    throw new Error(`Failed to read sheet rows: ${dataRes.statusText}`);
  }
  const dataJson = await dataRes.json();
  const rows = dataJson.values || [];

  return rows.map((row) => {
    const getVal = (key) => (headerMap[key] !== undefined && headerMap[key] < row.length ? row[headerMap[key]] : '');
    const remarksVal = getVal('remarks');

    let authorName = getVal('authorName');
    if (!authorName && remarksVal) {
      const match = remarksVal.match(/\[Author:\s*([^\]]+)\]/i);
      if (match) authorName = match[1].trim();
    }

    let authorBatch = getVal('authorBatch');
    if (!authorBatch && remarksVal) {
      const match = remarksVal.match(/\[Batch:\s*([^\]]+)\]/i);
      if (match) authorBatch = match[1].trim();
    }

    if (authorName) {
      const embeddedMatch = authorName.match(/\s*\((?:Batch:\s*)?([^)]+)\)/i);
      if (embeddedMatch) {
        if (!authorBatch) authorBatch = embeddedMatch[1].trim();
        authorName = authorName.replace(/\s*\((?:Batch:\s*)?([^)]+)\)/i, '').trim();
      }
    }

    return {
      fileId: getVal('fileId'),
      driveFileId: getVal('driveFileId'),
      fileName: getVal('fileName'),
      courseCode: getVal('courseCode'),
      courseName: getVal('courseName'),
      semester: getVal('semester'),
      fileType: getVal('fileType'),
      professor: getVal('professor'),
      uploaderName: getVal('uploaderName'),
      authorName,
      authorBatch,
      remarks: remarksVal,
    };
  });
}

async function main() {
  token = await getAccessToken();
  console.log("✓ OAuth token obtained successfully.");

  const fileRows = await getAllSheetRows();
  console.log(`✓ Fetched ${fileRows.length} rows from Google Sheets.\n`);

  let renamedCount = 0;
  let movedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const FILE_TYPE_FOLDERS = {
    qpaper: 'Question Papers',
    notes: 'Notes',
    slides: 'Slides',
    lab: 'Lab Material',
    assignment: 'Assignments',
    other: 'Other',
  };

  for (let i = 0; i < fileRows.length; i++) {
    const file = fileRows[i];
    const driveFileId = file.driveFileId?.trim();

    if (!driveFileId) {
      skippedCount++;
      console.log(`[${i+1}/${fileRows.length}] ⏭️ SKIP: "${file.fileName}" (No driveFileId)`);
      continue;
    }

    try {
      const meta = await getDriveFileMetadata(driveFileId);
      const currentParents = meta.parents || [];
      const currentParentsStr = currentParents.join(',');

      // 1. Rename logic
      let nameChanged = false;
      if (meta.name !== file.fileName) {
        nameChanged = true;
        console.log(`[${i+1}/${fileRows.length}] ✏️ RENAME: "${meta.name}" ➔ "${file.fileName}"`);
        if (isExecute) {
          await renameDriveFile(driveFileId, file.fileName);
        }
        renamedCount++;
      }

      // 2. Folder logic
      const isAdvance = String(file.semester || '').toUpperCase().includes('ADVANCE');
      const courseCategory = isAdvance ? 'Adv Courses' : 'Core Courses';

      const pathComponents = [courseCategory];
      if (!isAdvance) {
        pathComponents.push(`Sem ${file.semester}`);
      }
      pathComponents.push(`${file.courseCode.trim()} ${file.courseName.trim()}`);

      const typeFolder = FILE_TYPE_FOLDERS[(file.fileType || '').toLowerCase()] || 'Other';
      pathComponents.push(typeFolder);

      if ((file.fileType || '').toLowerCase() === 'notes') {
        let authorFolder = (file.authorName || file.uploaderName || 'Unknown Authors').trim();
        if (file.authorBatch && !authorFolder.includes(file.authorBatch.trim())) {
          authorFolder = `${authorFolder} (${file.authorBatch.trim()})`;
        }
        pathComponents.push(authorFolder);
      } else {
        pathComponents.push((file.professor || 'Other Professors').trim());
      }

      let moved = false;
      let destFolderId = '';
      if (isExecute) {
        destFolderId = await resolveNestedFolder(ROOT_DRIVE_FOLDER_ID, pathComponents);
      } else {
        destFolderId = `mock-dest-${pathComponents.join('/')}`;
      }

      const isAlreadyInDest = currentParents.includes(destFolderId);

      if (!isAlreadyInDest) {
        moved = true;
        console.log(`[${i+1}/${fileRows.length}] 🚚 MOVE: "${file.fileName}" ➔ /${pathComponents.join('/')}`);
        if (isExecute) {
          await moveDriveFile(driveFileId, destFolderId, currentParentsStr);
        }
        movedCount++;
      }

      if (!nameChanged && !moved) {
        skippedCount++;
        console.log(`[${i+1}/${fileRows.length}] ✅ OK: "${file.fileName}" is up to date.`);
      }

    } catch (err) {
      errorCount++;
      console.error(`[${i+1}/${fileRows.length}] ❌ ERROR processing "${file.fileName}":`, err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(` SUMMARY REPORT (${isExecute ? 'EXECUTION COMPLETED' : 'DRY RUN AUDIT'})`);
  console.log(`======================================================`);
  console.log(` Total Files Examined: ${fileRows.length}`);
  console.log(` Files Renamed:        ${renamedCount}`);
  console.log(` Files Moved:          ${movedCount}`);
  console.log(` Files Up-to-Date:     ${skippedCount}`);
  console.log(` Errors Encountered:   ${errorCount}`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("FATAL SCRIPT ERROR:", err);
  process.exit(1);
});
