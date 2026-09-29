/**
 * PDF Text Extractor Service using pdfjs-dist
 * Extracts plain text across all pages of uploaded PDF mystery shopper reports.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Use unpkg CDN or bundled worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.0.379'}/build/pdf.worker.min.mjs`;
}

export async function extractTextFromPDFFile(
  file: File,
  onProgress?: (page: number, totalPages: number) => void
): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  const pageCount = pdfDocument.numPages;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();
    const strings = textContent.items
      .map((item: any) => (item.str !== undefined ? item.str : ''))
      .join(' ');
    pageTexts.push(strings);

    if (onProgress) {
      onProgress(pageNum, pageCount);
    }
  }

  const fullText = pageTexts.join('\n\n');
  return { text: fullText, pageCount };
}
