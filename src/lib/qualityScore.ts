export interface QualityScoreResult {
  totalScore: number;
  breakdown: {
    formatScore: number;
    sizeResolutionScore: number;
    textSearchabilityScore: number;
    completenessScore: number;
    clarityScore: number;
  };
  isVectorPdf: boolean;
  pageCount: number;
  details: string;
}

/**
 * Calculates a quantitative Quality Score (0 to 100) for a document or image file.
 * Compatible with Edge & Node environments (uses standard Web APIs & ArrayBuffer inspection).
 */
export function calculateDocumentQualityScore(params: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  arrayBuffer?: ArrayBuffer;
}): QualityScoreResult {
  const { fileName, mimeType, sizeBytes, arrayBuffer } = params;
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  let formatScore = 10;
  let sizeResolutionScore = 5;
  let textSearchabilityScore = 0;
  let completenessScore = 5;
  let clarityScore = 5;

  let isVectorPdf = false;
  let pageCount = 1;

  // 1. Format & Structure Analysis (Max 30)
  const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
  const isOfficeDoc =
    mimeType.includes('officedocument') ||
    ['docx', 'pptx', 'xlsx', 'ppt'].includes(ext);
  const isImage = mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

  if (isPdf) {
    formatScore = 20; // Default PDF baseline
  } else if (isOfficeDoc) {
    formatScore = 28;
  } else if (isImage) {
    formatScore = 10;
  }

  // If buffer is available, inspect PDF internal structure
  let pdfTextLength = 0;
  if (arrayBuffer && isPdf) {
    try {
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const text = decoder.decode(arrayBuffer);

      // Count PDF pages by searching for /Type /Page (excluding /Pages)
      const pageMatches = text.match(/\/Type\s*\/Page\b/g);
      if (pageMatches) {
        pageCount = pageMatches.length;
      }

      // Check for vector text blocks (/Font, BT...ET operators, /Text)
      const hasFonts = /\/Font\b/.test(text);
      const textBlocks = text.match(/\(.*?\)[\s]*T[jJ]/g) || text.match(/BT[\s\S]*?ET/g);
      
      if (textBlocks) {
        pdfTextLength = textBlocks.join('').length;
      }

      if (hasFonts && pdfTextLength > 100) {
        isVectorPdf = true;
        formatScore = 30; // Max score for native vector text PDF
        textSearchabilityScore = 25; // Max searchability
      } else if (hasFonts || pdfTextLength > 20) {
        textSearchabilityScore = 15;
      }
    } catch {
      // Stream parsing fallback
    }
  }

  // 2. Size & Resolution Score (Max 25)
  // Higher file size up to a realistic threshold indicates better image resolution / higher DPI scan
  if (sizeBytes > 5 * 1024 * 1024) {
    sizeResolutionScore = 25;
  } else if (sizeBytes > 2 * 1024 * 1024) {
    sizeResolutionScore = 20;
  } else if (sizeBytes > 800 * 1024) {
    sizeResolutionScore = 15;
  } else if (sizeBytes > 300 * 1024) {
    sizeResolutionScore = 10;
  } else {
    sizeResolutionScore = 5;
  }

  // 3. Completeness Score (Max 10)
  if (pageCount >= 4) {
    completenessScore = 10;
  } else if (pageCount === 3) {
    completenessScore = 8;
  } else if (pageCount === 2) {
    completenessScore = 6;
  } else {
    completenessScore = 4;
  }

  // 4. Contrast & Clarity Estimation (Max 10)
  if (arrayBuffer && isImage) {
    // Sample luminance across image buffer to estimate background contrast
    const bytes = new Uint8Array(arrayBuffer);
    let sampleSum = 0;
    let sampleSqSum = 0;
    const step = Math.max(1, Math.floor(bytes.length / 500));
    let samples = 0;

    for (let i = 0; i < bytes.length; i += step) {
      const val = bytes[i];
      sampleSum += val;
      sampleSqSum += val * val;
      samples++;
    }

    if (samples > 0) {
      const mean = sampleSum / samples;
      const variance = sampleSqSum / samples - mean * mean;
      // High variance in pixel intensity indicates clear contrast (dark text on white page)
      if (variance > 2500 && mean > 120) {
        clarityScore = 10; // Crisp scan
      } else if (variance > 1000) {
        clarityScore = 7;
      } else {
        clarityScore = 4; // Flat / dark camera photo shadow
      }
    }
  } else if (isVectorPdf || isOfficeDoc) {
    clarityScore = 10; // Vector digital document is crystal clear
  }

  const totalScore = Math.min(
    100,
    formatScore + sizeResolutionScore + textSearchabilityScore + completenessScore + clarityScore
  );

  const details = `Quality score ${totalScore}/100 [Format: ${formatScore}, Size/Res: ${sizeResolutionScore}, Searchability: ${textSearchabilityScore}, Completeness: ${completenessScore}, Clarity: ${clarityScore}]`;

  return {
    totalScore,
    breakdown: {
      formatScore,
      sizeResolutionScore,
      textSearchabilityScore,
      completenessScore,
      clarityScore,
    },
    isVectorPdf,
    pageCount,
    details,
  };
}
