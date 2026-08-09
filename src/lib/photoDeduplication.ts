/**
 * Deduplication helper for detecting camera photos & scans of the same physical document.
 * Operates in Edge & Node JS runtimes without external C++ binary dependencies.
 */

/**
 * Normalizes text and generates a set of 3-character shingles (N-grams)
 */
export function extractTextShingles(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const shingles = new Set<string>();
  const shingleSize = 3;

  for (let i = 0; i <= normalized.length - shingleSize; i++) {
    shingles.add(normalized.substring(i, i + shingleSize));
  }

  return shingles;
}

/**
 * Calculates Jaccard Similarity index (0.0 to 1.0) between two text streams.
 */
export function calculateTextJaccardSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;

  const setA = extractTextShingles(textA);
  const setB = extractTextShingles(textB);

  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionSize = 0;
  setA.forEach((item) => {
    if (setB.has(item)) {
      intersectionSize++;
    }
  });

  const unionSize = setA.size + setB.size - intersectionSize;
  return unionSize > 0 ? intersectionSize / unionSize : 0;
}

/**
 * Generates a 64-bit perceptual hash (dHash) from byte buffer samples.
 */
export function computePerceptualHash(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length === 0) return '0000000000000000';

  // Sample 64 points across the buffer
  const sampleCount = 64;
  const step = Math.max(1, Math.floor(bytes.length / sampleCount));
  const samples: number[] = [];

  for (let i = 0; i < sampleCount && i * step < bytes.length; i++) {
    samples.push(bytes[i * step]);
  }

  let hashBitString = '';
  for (let i = 0; i < samples.length - 1; i++) {
    // Difference hash: bit is 1 if current byte > next byte
    hashBitString += samples[i] > samples[i + 1] ? '1' : '0';
  }

  // Pad to 64 bits if needed
  while (hashBitString.length < 64) {
    hashBitString += '0';
  }

  // Convert binary string to 16-character hex
  let hexHash = '';
  for (let i = 0; i < 64; i += 4) {
    const nibble = hashBitString.substring(i, i + 4);
    hexHash += parseInt(nibble, 2).toString(16);
  }

  return hexHash;
}

/**
 * Calculates the Hamming Distance (number of differing bits) between two 16-char hex hashes.
 */
export function calculateHammingDistance(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return 64;

  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    const valA = parseInt(hashA[i], 16);
    const valB = parseInt(hashB[i], 16);
    let xor = valA ^ valB;

    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }

  return distance;
}

/**
 * Determines if two documents are duplicate camera photos/scans of the same paper.
 */
export function evaluateCameraScanDeduplication(docA: {
  text?: string;
  buffer?: ArrayBuffer;
}, docB: {
  text?: string;
  buffer?: ArrayBuffer;
}): { isDuplicate: boolean; confidence: number; reason: string } {
  // 1. Text Similarity Check
  if (docA.text && docB.text) {
    const similarity = calculateTextJaccardSimilarity(docA.text, docB.text);
    if (similarity >= 0.75) {
      return {
        isDuplicate: true,
        confidence: similarity,
        reason: `High text similarity score (${(similarity * 100).toFixed(1)}%)`,
      };
    }
  }

  // 2. Visual Layout / Perceptual Hash Check
  if (docA.buffer && docB.buffer) {
    const hashA = computePerceptualHash(docA.buffer);
    const hashB = computePerceptualHash(docB.buffer);
    const hammingDist = calculateHammingDistance(hashA, hashB);

    if (hammingDist <= 8) {
      const confidence = (64 - hammingDist) / 64;
      return {
        isDuplicate: true,
        confidence,
        reason: `Visual layout matching (Hamming distance ${hammingDist}/64)`,
      };
    }
  }

  return {
    isDuplicate: false,
    confidence: 0,
    reason: 'Distinct content and layout',
  };
}
