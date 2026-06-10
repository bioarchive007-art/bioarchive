import { LIBGEN_BASE_URL } from '@/data/curriculum';

/**
 * Computes a SHA-256 hash of an ArrayBuffer using Web Crypto API.
 * Named computeMD5 for structural database compatibility.
 * Returns the hex representation of the digest.
 */
export async function computeMD5(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates search link targeting Library Genesis search queries.
 */
export function getLibgenSearchURL(query: string): string {
  return `${LIBGEN_BASE_URL}${encodeURIComponent(query)}`;
}
