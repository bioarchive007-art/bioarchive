import { CONFIG } from '@/config';
import { SheetRow } from '@/types';
import { getAccessToken } from './google-auth';
import { fetchWithTimeout, normalizeCourseCode } from './utils';

// Shadow global fetch with our custom timeout-supported fetch wrapper
const fetch = fetchWithTimeout;

const DEFAULT_HEADER_MAP = CONFIG.SHEET_HEADERS.reduce((acc, header, index) => {
  acc[header] = index;
  return acc;
}, {} as Record<string, number>);

function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

async function getSheetHeaderMap(): Promise<Record<string, number>> {
  const token = await getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!1:1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet headers: ${res.statusText}`);
  }
  
  const data = await res.json() as { values?: string[][] };
  const headers = data.values?.[0] || [];
  
  if (headers.length === 0) {
    await initializeSheetHeaders();
    return DEFAULT_HEADER_MAP;
  }
  
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    map[h] = i;
  });
  return map;
}

function rowToSheetRow(row: any[], headerMap: Record<string, number>): SheetRow {
  const getVal = (header: string, defaultVal: any = '') => {
    const idx = headerMap[header];
    if (idx === undefined || idx >= row.length) return defaultVal;
    return row[idx];
  };

  return {
    fileId: getVal('fileId'),
    r2Key: getVal('r2Key'),
    driveFileId: getVal('driveFileId'),
    semester: getVal('semester'),
    year: getVal('year'),
    courseCode: getVal('courseCode'),
    courseName: getVal('courseName'),
    professor: getVal('professor'),
    professor2: getVal('professor2'),
    professor3: getVal('professor3'),
    examType: getVal('examType'),
    fileType: getVal('fileType'),
    fileName: getVal('fileName'),
    uploaderName: getVal('uploaderName'),
    uploadDate: getVal('uploadDate'),
    md5Hash: getVal('md5Hash'),
    r2Url: getVal('r2Url'),
    driveWebViewLink: getVal('driveWebViewLink'),
    downloadCount: Number(getVal('downloadCount', 0)) || 0,
    remarks: getVal('remarks'),
    status: getVal('status', 'approved'),
  };
}

function sheetRowToArray(sheetRow: SheetRow, headerMap: Record<string, number>): any[] {
  const maxIndex = Math.max(...Object.values(headerMap), CONFIG.SHEET_HEADERS.length - 1);
  const arr = new Array(maxIndex + 1).fill('');
  
  Object.keys(headerMap).forEach((header) => {
    const idx = headerMap[header];
    if (header in sheetRow) {
      arr[idx] = sheetRow[header as keyof SheetRow];
    }
  });
  
  return arr;
}

export async function initializeSheetHeaders(): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!1:1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to check sheet headers: ${res.statusText}`);
  }
  
  const data = await res.json() as { values?: string[][] };
  const existingHeaders = data.values?.[0] || [];
  
  // Check if existing headers match the expected headers
  const headersMatch = existingHeaders.length === CONFIG.SHEET_HEADERS.length &&
    CONFIG.SHEET_HEADERS.every((h, i) => existingHeaders[i] === h);
  
  if (!headersMatch) {
    const lastCol = getColumnLetter(CONFIG.SHEET_HEADERS.length - 1);
    const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!A1:${lastCol}1?valueInputOption=RAW`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [CONFIG.SHEET_HEADERS as unknown as string[]]
      })
    });
    
    if (!writeRes.ok) {
      const err = await writeRes.text();
      throw new Error(`Failed to write sheet headers: ${writeRes.statusText} - ${err}`);
    }
  }
}


export async function getAllFiles(): Promise<SheetRow[]> {
  const token = await getAccessToken();
  const headerMap = await getSheetHeaderMap();
  
  const lastCol = getColumnLetter(CONFIG.SHEET_HEADERS.length - 1);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!A2:${lastCol}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get files from sheet: ${res.statusText}`);
  }
  
  const data = await res.json() as { values?: any[][] };
  const rows = data.values || [];
  
  return rows
    .filter(row => row.length > 0 && row.some(val => val !== ''))
    .map(row => rowToSheetRow(row, headerMap));
}

export async function getFilesByCourse(courseCode: string, semester: string, includePending = false): Promise<SheetRow[]> {
  const { oldCode: queryOld } = normalizeCourseCode(courseCode);
  const allFiles = await getAllFiles();
  return allFiles.filter(
    (file) => {
      const { oldCode: fileOld } = normalizeCourseCode(file.courseCode);
      return fileOld.toLowerCase() === queryOld.toLowerCase() &&
        file.semester.toString() === semester.toString() &&
        (includePending || file.status === 'approved');
    }
  );
}

async function getSheetId(sheetName: string, token: string): Promise<number> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json() as { sheets?: { properties: { title: string; sheetId: number } }[] };
      const sheet = data.sheets?.find(s => s.properties.title === sheetName);
      if (sheet) return sheet.properties.sheetId;
    }
  } catch (err) {
    console.error('Failed to get sheet ID:', err);
  }
  return 0; // Fallback to 0
}

export async function appendFileRecord(row: SheetRow, isDuplicate?: boolean): Promise<void> {
  const token = await getAccessToken();
  const headerMap = await getSheetHeaderMap();
  const rowArray = sheetRowToArray(row, headerMap);
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!A:A:append?valueInputOption=RAW`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowArray]
    })
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to append file record: ${res.statusText} - ${err}`);
  }

  // If this is a duplicate entry, highlight the row in orange!
  if (isDuplicate) {
    try {
      const data = await res.json() as { updates?: { updatedRange?: string } };
      const range = data.updates?.updatedRange || '';
      const rowMatch = range.split('!')[1]?.match(/\d+/);
      
      if (rowMatch) {
        const rowIndex = parseInt(rowMatch[0], 10) - 1; // 0-indexed for startRowIndex
        const sheetId = await getSheetId('Sheet1', token);

        const colorRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                repeatCell: {
                  range: {
                    sheetId: sheetId,
                    startRowIndex: rowIndex,
                    endRowIndex: rowIndex + 1,
                    startColumnIndex: 0,
                    endColumnIndex: CONFIG.SHEET_HEADERS.length
                  },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: {
                        red: 0.99,   // Soft orange (red ~ 253)
                        green: 0.91, // (green ~ 231)
                        blue: 0.82   // (blue ~ 209)
                      }
                    }
                  },
                  fields: 'userEnteredFormat.backgroundColor'
                }
              }
            ]
          })
        });

        if (!colorRes.ok) {
          const colorErr = await colorRes.text();
          console.error('Failed to apply orange color via batchUpdate:', colorErr);
        }
      }
    } catch (err) {
      console.error('Failed to color duplicate row in Google Sheets:', err);
    }
  }
}


export async function checkDuplicate(md5Hash: string): Promise<SheetRow | null> {
  const allFiles = await getAllFiles();
  const match = allFiles.find(file => file.md5Hash === md5Hash);
  return match || null;
}

export async function checkDuplicateMetadata(params: {
  semester: string;
  year: string;
  courseName: string;
  professor: string;
  fileType: string;
  examType?: string;
}): Promise<SheetRow | null> {
  const allFiles = await getAllFiles();
  const match = allFiles.find((file) => {
    const fileTypeMatch = file.fileType.toLowerCase() === params.fileType.toLowerCase();
    const semMatch = file.semester.toString() === params.semester.toString();
    const yearMatch = file.year.toString() === params.year.toString();
    const courseMatch = file.courseName.toLowerCase().trim() === params.courseName.toLowerCase().trim();
    
    // Compare professors by their primary name (first name word after Dr/Prof prefix)
    const getFirstWord = (name: string) => name.replace(/^(Dr\.|Prof\.|Dr|Prof)\s+/i, '').trim().split(/[\s._-]+/)[0]?.toLowerCase() || '';
    const fileProfFirst = getFirstWord(file.professor);
    const paramProfFirst = getFirstWord(params.professor);
    const profMatch = fileProfFirst === paramProfFirst && fileProfFirst !== '';

    if (fileTypeMatch && semMatch && yearMatch && courseMatch && profMatch) {
      if (params.fileType.toLowerCase() === 'qpaper') {
        return (
          file.examType.toLowerCase().trim() ===
          (params.examType || '').toLowerCase().trim()
        );
      }
      return true;
    }
    return false;
  });
  return match || null;
}

export async function incrementDownloadCount(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const headerMap = await getSheetHeaderMap();
  
  const lastCol = getColumnLetter(CONFIG.SHEET_HEADERS.length - 1);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!A:${lastCol}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet values: ${res.statusText}`);
  }
  
  const data = await res.json() as { values?: any[][] };
  const rows = data.values || [];
  if (rows.length < 2) {
    throw new Error("Sheet has no data rows");
  }
  
  const fileIdColIdx = headerMap['fileId'];
  const downloadCountColIdx = headerMap['downloadCount'];
  
  if (fileIdColIdx === undefined || downloadCountColIdx === undefined) {
    throw new Error("Missing fileId or downloadCount columns in the sheet registry");
  }
  
  let sheetRowIndex = -1;
  let currentCount = 0;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[fileIdColIdx] === fileId) {
      sheetRowIndex = i + 1;
      currentCount = Number(row[downloadCountColIdx] || 0) || 0;
      break;
    }
  }
  
  if (sheetRowIndex === -1) {
    throw new Error(`File record with fileId ${fileId} not found`);
  }
  
  const newCount = currentCount + 1;
  const colLetter = getColumnLetter(downloadCountColIdx);
  const cellRange = `Sheet1!${colLetter}${sheetRowIndex}`;
  
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${cellRange}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [[newCount]]
    })
  });
  
  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Failed to increment download count: ${updateRes.statusText} - ${err}`);
  }
}

export async function updateSheetFileName(fileId: string, newFileName: string): Promise<void> {
  const token = await getAccessToken();
  const headerMap = await getSheetHeaderMap();

  const lastCol = getColumnLetter(CONFIG.SHEET_HEADERS.length - 1);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!A:${lastCol}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch sheet values: ${res.statusText}`);
  }

  const data = (await res.json()) as { values?: any[][] };
  const rows = data.values || [];
  if (rows.length < 2) return;

  const fileIdColIdx = headerMap['fileId'];
  const fileNameColIdx = headerMap['fileName'];

  if (fileIdColIdx === undefined || fileNameColIdx === undefined) {
    throw new Error('Missing fileId or fileName columns in the sheet registry');
  }

  let sheetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][fileIdColIdx] === fileId) {
      sheetRowIndex = i + 1;
      break;
    }
  }

  if (sheetRowIndex === -1) return;

  const colLetter = getColumnLetter(fileNameColIdx);
  const cellRange = `Sheet1!${colLetter}${sheetRowIndex}`;

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${cellRange}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[newFileName]],
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Failed to update fileName cell: ${updateRes.statusText} - ${err}`);
  }
}


export async function deleteFileRecord(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const headerMap = await getSheetHeaderMap();
  
  const lastCol = getColumnLetter(CONFIG.SHEET_HEADERS.length - 1);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!A:${lastCol}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet values for deletion: ${res.statusText}`);
  }
  
  const data = await res.json() as { values?: any[][] };
  const rows = data.values || [];
  
  const fileIdColIdx = headerMap['fileId'];
  if (fileIdColIdx === undefined) {
    throw new Error("Missing fileId column in the sheet registry");
  }
  
  let sheetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[fileIdColIdx] === fileId) {
      sheetRowIndex = i + 1;
      break;
    }
  }
  
  if (sheetRowIndex === -1) {
    throw new Error(`File record with fileId ${fileId} not found`);
  }
  
  const clearRange = `Sheet1!${sheetRowIndex}:${sheetRowIndex}`;
  const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${clearRange}:clear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  
  if (!clearRes.ok) {
    const err = await clearRes.text();
    throw new Error(`Failed to clear row: ${clearRes.statusText} - ${err}`);
  }
}

/* ================================================================
   Notices & Requests Sheets Helper Functions
   ================================================================ */

import { FileRequest, Notice } from '@/types';

async function createSheetTab(title: string, token: string): Promise<void> {
  try {
    const checkRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!checkRes.ok) return;
    const data = await checkRes.json() as any;
    const exists = data.sheets?.some((s: any) => s.properties.title === title);
    if (exists) return;

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title } } }]
      })
    });
  } catch (err) {
    console.error(`Failed to create sheet tab "${title}":`, err);
  }
}

export async function initializeRequestsAndNotices(): Promise<void> {
  try {
    const token = await getAccessToken();
    await createSheetTab('Requests', token);
    await createSheetTab('Notices', token);

    const reqHeaders = ['requestId', 'courseCode', 'courseName', 'semester', 'year', 'fileType', 'uploaderName', 'remarks', 'requestDate', 'status', 'fulfilledFileId'];
    const noticeHeaders = ['id', 'date', 'title', 'content', 'type', 'active'];

    // Requests headers
    const reqHeaderCheck = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Requests!1:1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (reqHeaderCheck.ok) {
      const data = await reqHeaderCheck.json() as any;
      if (!data.values || data.values.length === 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Requests!A1:K1?valueInputOption=RAW`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [reqHeaders] })
        });
      }
    }

    // Notices headers
    const noticeHeaderCheck = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Notices!1:1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (noticeHeaderCheck.ok) {
      const data = await noticeHeaderCheck.json() as any;
      if (!data.values || data.values.length === 0) {
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Notices!A1:F1?valueInputOption=RAW`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [noticeHeaders] })
        });
      }
    }
  } catch (err) {
    console.error('Failed to initialize requests/notices sheets:', err);
  }
}

export async function getAllRequests(): Promise<FileRequest[]> {
  const token = await getAccessToken();
  await initializeRequestsAndNotices();
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Requests!A2:K`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get requests from sheet: ${res.statusText}`);
  }
  
  const data = await res.json() as { values?: any[][] };
  const rows = data.values || [];
  
  return rows
    .filter(row => row.length > 0 && row.some(val => val !== ''))
    .map(row => ({
      requestId: row[0] || '',
      courseCode: row[1] || '',
      courseName: row[2] || '',
      semester: row[3] || '',
      year: row[4] || '',
      fileType: row[5] || '',
      uploaderName: row[6] || '',
      remarks: row[7] || '',
      requestDate: row[8] || '',
      status: row[9] || 'pending',
      fulfilledFileId: row[10] || '',
    }));
}

export async function appendRequestRecord(req: FileRequest): Promise<void> {
  const token = await getAccessToken();
  await initializeRequestsAndNotices();

  const rowArray = [
    req.requestId,
    req.courseCode,
    req.courseName,
    req.semester,
    req.year,
    req.fileType,
    req.uploaderName,
    req.remarks,
    req.requestDate,
    req.status,
    req.fulfilledFileId || '',
  ];

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Requests!A:A:append?valueInputOption=RAW`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowArray]
    })
  });
  
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to append request record: ${res.statusText} - ${err}`);
  }
}

export async function getAllNotices(): Promise<Notice[]> {
  const token = await getAccessToken();
  await initializeRequestsAndNotices();
  
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Notices!A2:F`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get notices from sheet: ${res.statusText}`);
  }
  
  const data = await res.json() as { values?: any[][] };
  const rows = data.values || [];
  
  return rows
    .filter(row => row.length > 0 && row.some(val => val !== ''))
    .map(row => ({
      id: row[0] || '',
      date: row[1] || '',
      title: row[2] || '',
      content: row[3] || '',
      type: row[4] || 'info',
      active: row[5] === 'TRUE' || row[5] === true || String(row[5]).toLowerCase() === 'true',
    }));
}

export async function fulfillRequest(requestId: string, fileId: string): Promise<void> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Requests!A2:A`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;

    const data = await res.json() as { values?: any[][] };
    const rows = data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === requestId) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) return;

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Requests!J${rowIndex}:K${rowIndex}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [['fulfilled', fileId]]
      })
    });
  } catch (err) {
    console.error('[sheets] Failed to fulfill request:', err);
  }
}



export async function appendFileDownloadRecord(record: {
  fileName: string;
  courseCode: string;
  semester: string;
  fileId: string;
  uploaderName: string;
  userEmail: string;
  userAgent: string;
}): Promise<void> {
  const token = await getAccessToken();
  await createSheetTab('FileDownloads', token);

  const headers = ['Timestamp', 'File Name', 'Course Code', 'Semester', 'File ID', 'Uploader Name', 'User Email', 'User Agent'];

  // Check and initialize headers if empty
  const headerCheck = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/FileDownloads!1:1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (headerCheck.ok) {
    const data = await headerCheck.json() as any;
    if (!data.values || data.values.length === 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/FileDownloads!A1:H1?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [headers] })
      });
    }
  }

  const config = await getSiteConfig().catch(() => ({ collectTimestamps: true, collectEmails: true, collectUserAgents: true, enableDownloadLogging: true }));
  if (config.enableDownloadLogging === false) {
    return;
  }
  const timestamp = config.collectTimestamps ? new Date().toISOString() : 'Omitted';
  const email = config.collectEmails ? record.userEmail : 'Anonymous';
  const userAgent = config.collectUserAgents ? record.userAgent : 'Omitted';

  const rowArray = [
    timestamp,
    record.fileName,
    record.courseCode,
    record.semester,
    record.fileId,
    record.uploaderName,
    email,
    userAgent,
  ];

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/FileDownloads!A:A:append?valueInputOption=RAW`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowArray]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to append file download record: ${res.statusText} - ${err}`);
  }
}

export async function approveFileRecord(fileId: string): Promise<void> {
  const token = await getAccessToken();
  const headerMap = await getSheetHeaderMap();
  
  const lastCol = getColumnLetter(CONFIG.SHEET_HEADERS.length - 1);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/Sheet1!A:${lastCol}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet values for approval: ${res.statusText}`);
  }
  
  const data = await res.json() as { values?: any[][] };
  const rows = data.values || [];
  
  const fileIdColIdx = headerMap['fileId'];
  const statusColIdx = headerMap['status'];
  
  if (fileIdColIdx === undefined || statusColIdx === undefined) {
    throw new Error("Missing fileId or status columns in the sheet registry");
  }
  
  let sheetRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][fileIdColIdx] === fileId) {
      sheetRowIndex = i + 1;
      break;
    }
  }
  
  if (sheetRowIndex === -1) {
    throw new Error(`File record with fileId ${fileId} not found`);
  }
  
  const colLetter = getColumnLetter(statusColIdx);
  const cellRange = `Sheet1!${colLetter}${sheetRowIndex}`;
  
  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/${cellRange}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [['approved']]
    })
  });
  
  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Failed to approve file record in sheets: ${updateRes.statusText} - ${err}`);
  }
}

export async function appendLoginRecord(record: {
  email: string;
  name: string;
  userAgent: string;
}): Promise<void> {
  const token = await getAccessToken();
  await createSheetTab('LoginHistory', token);

  const headers = ['Timestamp', 'Email', 'Name', 'User Agent'];

  // Check and initialize headers if empty
  const headerCheck = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/LoginHistory!1:1`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (headerCheck.ok) {
    const data = await headerCheck.json() as any;
    if (!data.values || data.values.length === 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/LoginHistory!A1:D1?valueInputOption=RAW`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [headers] })
      });
    }
  }

  const config = await getSiteConfig().catch(() => ({ collectTimestamps: true, collectEmails: true, collectUserAgents: true }));
  const timestamp = config.collectTimestamps ? new Date().toISOString() : 'Omitted';
  const email = config.collectEmails ? record.email : 'Anonymous';
  const name = config.collectEmails ? record.name : 'Anonymous';
  const userAgent = config.collectUserAgents ? record.userAgent : 'Omitted';

  const rowArray = [
    timestamp,
    email,
    name,
    userAgent,
  ];

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/LoginHistory!A:A:append?valueInputOption=RAW`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowArray]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to append login record: ${res.statusText} - ${err}`);
  }
}

// Simple memory cache for SiteConfig to prevent exceeding Google Sheets API quotas.
let cachedConfig: Record<string, boolean> | null = null;
let cachedConfigTimestamp = 0;
const CONFIG_CACHE_TTL = 30000; // 30 seconds cache TTL

export async function getSiteConfig(): Promise<Record<string, boolean>> {
  const now = Date.now();
  if (cachedConfig && (now - cachedConfigTimestamp < CONFIG_CACHE_TTL)) {
    return cachedConfig;
  }
  const token = await getAccessToken();
  await createSheetTab('SiteConfig', token);

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/SiteConfig!A2:B`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const config: Record<string, boolean> = {
    collectEmails: true,
    collectUserAgents: true,
    collectTimestamps: true,
    renameFiles: true,
    requireModeration: true,
    restrictToInstitutionalEmail: true,
    enableFilePreviews: true,
    enableReferenceBooks: true,
    enableUploads: true,
    enableFileRequests: true,
    enableNotices: true,
    enableSearch: true,
    enableDownloadLogging: true,
    enableContactForm: true,
    enableDownloads: true,
    requireNiserToUpload: true,
    requireNiserToDownload: true,
  };

  if (!res.ok) {
    return config;
  }

  const data = await res.json() as { values?: any[][] };
  const rows = data.values || [];

  if (rows.length === 0) {
    const headers = ['Feature', 'Enabled'];
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/SiteConfig!A1:B1?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [headers] })
    });

    const defaultRows = Object.entries(config).map(([k, v]) => [k, String(v)]);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/SiteConfig!A2:B30?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: defaultRows })
    });

    return config;
  }

  rows.forEach((row) => {
    const key = row[0];
    const val = row[1];
    if (key && val !== undefined) {
      config[key] = val === 'true' || val === true || String(val).toLowerCase() === 'true';
    }
  });

  cachedConfig = config;
  cachedConfigTimestamp = Date.now();
  return config;
}

export async function updateSiteConfig(config: Record<string, boolean>): Promise<void> {
  // Invalidate cache immediately on updates
  cachedConfig = null;
  cachedConfigTimestamp = 0;

  const token = await getAccessToken();
  await createSheetTab('SiteConfig', token);

  const rows = Object.entries(config).map(([k, v]) => [k, String(v)]);
  const headers = ['Feature', 'Enabled'];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEET_ID}/values/SiteConfig!A1:B30?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [headers, ...rows]
    })
  });
}



