import { CONFIG } from '@/config';
import { getAccessToken } from './google-auth';

/**
 * Uploads a file to Google Drive using multipart upload.
 * Returns the fileId and webViewLink.
 */
export async function uploadToDrive(params: {
  fileName: string;
  mimeType: string;
  buffer: ArrayBuffer;
  folderId: string;
}): Promise<{ fileId: string; webViewLink: string }> {
  const token = await getAccessToken();
  const boundary = 'bioarchive_multipart_boundary';

  const metadata = JSON.stringify({
    name: params.fileName,
    parents: [params.folderId]
  });

  const encoder = new TextEncoder();
  const part1 = encoder.encode(
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `\r\n--${boundary}\r\n` +
    `Content-Type: ${params.mimeType}\r\n\r\n`
  );
  const part2 = new Uint8Array(params.buffer);
  const part3 = encoder.encode(`\r\n--${boundary}--`);

  // Combine headers, binary payload, and footers into a single Blob
  const body = new Blob([part1, part2, part3]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upload to Google Drive: ${res.statusText} - ${errorText}`);
  }

  const data = (await res.json()) as {
    id: string;
    webViewLink: string;
  };

  return {
    fileId: data.id,
    webViewLink: data.webViewLink
  };
}

/**
 * Moves a Google Drive file to the quarantine folder.
 */
export async function moveToQuarantine(driveFileId: string): Promise<void> {
  const token = await getAccessToken();
  const quarantineFolderId = CONFIG.DRIVE_QUARANTINE_FOLDER_ID;

  // Retrieve current parents of the file
  const getRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=parents`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!getRes.ok) {
    const errorText = await getRes.text();
    throw new Error(`Failed to get file metadata from Google Drive: ${getRes.statusText} - ${errorText}`);
  }

  const fileData = (await getRes.json()) as { parents?: string[] };
  const currentParents = fileData.parents?.join(',') || '';

  // Update parents using PATCH
  const patchUrl = new URL(`https://www.googleapis.com/drive/v3/files/${driveFileId}`);
  patchUrl.searchParams.append('addParents', quarantineFolderId);
  if (currentParents) {
    patchUrl.searchParams.append('removeParents', currentParents);
  }

  const patchRes = await fetch(patchUrl.toString(), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!patchRes.ok) {
    const errorText = await patchRes.text();
    throw new Error(`Failed to move file to quarantine on Google Drive: ${patchRes.statusText} - ${errorText}`);
  }
}

/**
 * Deletes a file from Google Drive permanently.
 */
export async function deleteFromDrive(driveFileId: string): Promise<void> {
  const token = await getAccessToken();

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete file from Google Drive: ${res.statusText} - ${errorText}`);
  }
}

/**
 * Updates a file to be accessible by either anyone or a specific domain.
 */
export async function makeFilePublic(driveFileId: string): Promise<void> {
  const token = await getAccessToken();

  // TOGGLE: Comment/uncomment the lines below to switch between public access (anyone) and NISER domain restricted access
  const sharingBody = { role: 'reader', type: 'anyone' }; // PUBLIC ACCESS
  // const sharingBody = { role: 'reader', type: 'domain', domain: 'niser.ac.in' }; // NISER DOMAIN ONLY

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(sharingBody),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[drive] Failed to set permissions for file ${driveFileId}: ${res.statusText} - ${errorText}`);
    throw new Error(`Failed to set file permissions: ${res.statusText}`);
  }
}

/**
 * Creates a Google Drive resumable upload session.
 * Returns the Location URL for uploading chunks.
 */
export async function createResumableUploadSession(params: {
  fileName: string;
  mimeType: string;
  fileSize: number;
  folderId: string;
}): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink,md5Checksum',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Upload-Content-Type': params.mimeType,
        'X-Upload-Content-Length': params.fileSize.toString(),
        'Content-Type': 'application/json; charset=UTF-8'
      },
      body: JSON.stringify({
        name: params.fileName,
        parents: [params.folderId]
      })
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create resumable upload session on Google Drive: ${res.statusText} - ${errorText}`);
  }

  const location = res.headers.get('Location');
  if (!location) {
    throw new Error('Resumable upload session created but Location header is missing in response.');
  }

  return location;
}

/**
 * Copies a Google Drive file to another folder (e.g., backup folder).
 */
export async function copyToBackupFolder(driveFileId: string, backupFolderId: string): Promise<string> {
  const token = await getAccessToken();

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}/copy?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parents: [backupFolderId],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[drive] Failed to copy file ${driveFileId} to backup folder ${backupFolderId}: ${res.statusText} - ${errorText}`);
    throw new Error(`Failed to copy file to backup folder: ${res.statusText}`);
  }

  const data = await res.json() as { id: string };
  return data.id;
}
