export interface SheetRow {
  fileId: string;
  r2Key: string;
  driveFileId: string;
  semester: string;
  year: string;
  courseCode: string;
  courseName: string;
  professor: string;
  professor2: string;
  professor3: string;
  examType: string;
  fileType: string;
  fileName: string;
  uploaderName: string;
  uploadDate: string;
  md5Hash: string;
  r2Url: string;
  driveWebViewLink: string;
  downloadCount: number;
  remarks: string;
  status: string; // 'pending_approval' | 'approved'
}

export interface FileRequest {
  requestId: string;
  courseCode: string;
  courseName: string;
  semester: string;
  year: string;
  fileType: string;
  uploaderName: string;
  remarks: string;
  requestDate: string;
  status: string;
  fulfilledFileId: string;
}

export interface BookRequest {
  requestId: string;
  timestamp: string;
  name: string;
  email: string;
  semester: string;
  courseCode: string;
  courseName: string;
  bookName: string;
  driveFileId: string;     // empty for new books until admin approves
  driveViewLink: string;   // empty for new books until approved
  isNewBook: boolean;
  author: string;          // only for new books
  edition: string;         // only for new books
  status: string;          // 'Pending' | 'Allowed' | 'Denied'
  allowedAt: string;       // ISO timestamp when admin approved
  expiresAt: string;       // ISO timestamp 3 days after allowedAt
}

export interface Notice {
  id: string;
  date: string;
  title: string;
  content: string;
  type: string;
  active: boolean;
}
