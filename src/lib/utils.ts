

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
 * Custom fetch wrapper with timeout support.
 * Set timeoutMs to 0 or null to disable timeout (useful for large file operations).
 */
export async function fetchWithTimeout(
  url: string | URL | Request,
  options?: RequestInit,
  timeoutMs: number | null = 30000
): Promise<Response> {
  if (!timeoutMs) {
    return fetch(url, options);
  }
  const controller = new AbortController();
  const { signal } = controller;
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal });
    return response;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Strips hidden metadata (like `[HIDDEN: ip=xxx, email=yyy]`) from the remarks field.
 */
export function stripHiddenRemarks(remarks?: string): string {
  if (!remarks) return '';
  return remarks.replace(/\s*\[HIDDEN:\s*[^\]]*\]\s*/gi, ' ').trim();
}

/**
 * Normalizes any course code format (e.g. B202, BIO202, B202 (BIO202)) into standard parts.
 */
export function normalizeCourseCode(code: string): { oldCode: string; newCode: string; canonical: string } {
  if (!code) return { oldCode: '', newCode: '', canonical: '' };
  const trimmed = code.trim().toUpperCase();
  // Match B or BIO followed by exactly 3 digits
  const match = trimmed.match(/^(?:BIO|B)?(\d{3})(?:\s*\(.*\))?$/i);
  if (match) {
    const num = match[1];
    return {
      oldCode: `B${num}`,
      newCode: `BIO${num}`,
      canonical: `B${num} (BIO${num})`
    };
  }
  return {
    oldCode: trimmed,
    newCode: trimmed,
    canonical: trimmed
  };
}

/**
 * Automatically computes a 2-3 letter acronym from the first letters of a professor's name.
 * e.g. "Dr. Rittik Deb" -> "RD", "Dr. Tirumala K Chaudhary" -> "TKC", "Dr. Abdur Rehman" -> "AR"
 */
export function getProfessorAcronym(profName: string): string {
  if (!profName || profName.trim() === '') return 'Unknown';
  const trimmed = profName.trim();

  // If profName is already a short uppercase acronym (e.g. TKC, AR, RD)
  if (/^[A-Z]{2,4}$/.test(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (lower === 'other') return 'Other';
  if (lower === 'na' || lower === 'n/a') return 'NA';
  if (lower === 'unknown') return 'Unknown';

  // Strip prefixes like Dr., Prof., Dr_, Prof_ (case-insensitive)
  const clean = trimmed.replace(/^(Dr\.|Prof\.|Dr|Prof)[\s._-]*/i, '').trim();
  if (!clean) return 'Unknown';

  // Split name by spaces, dots, hyphens, underscores and filter out empty strings
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return 'Unknown';

  if (parts.length === 1) {
    const word = parts[0];
    if (/^[A-Z]{2,4}$/i.test(word)) return word.toUpperCase();
    const upperWord = word.toUpperCase();
    if (upperWord === 'REHMAN') return 'AR';
    if (upperWord === 'CHAUDHARY') return 'TKC';
    if (upperWord === 'SRINIVASAN') return 'RS';
    if (upperWord === 'DIXIT') return 'MD';
    if (upperWord === 'DEB') return 'RD';
    return word.slice(0, 2).toUpperCase();
  }

  // Extract first letter of each word in uppercase
  const acronym = parts.map((part) => part[0].toUpperCase()).join('');
  return acronym || clean;
}



