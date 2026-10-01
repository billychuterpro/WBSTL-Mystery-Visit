/**
 * PDF Text Extractor Service using pdfjs-dist
 * Extracts plain text across all pages of uploaded PDF mystery shopper reports.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Use bundled worker if available or official CDN
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch (e) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
  }
}

interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function extractTextFromPDFFile(
  file: File,
  onProgress?: (page: number, totalPages: number) => void
): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    useSystemFonts: true,
  });

  const pdfDocument = await loadingTask.promise;
  const pageCount = pdfDocument.numPages;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: TextItemWithPos[] = textContent.items
      .filter((item: any) => typeof item.str === 'string' && item.str.trim().length > 0)
      .map((item: any) => ({
        str: item.str,
        x: item.transform[4] || 0,
        y: item.transform[5] || 0,
        width: item.width || 0,
        height: item.height || 0,
      }));

    // Group items into visual lines by Y position (within 5px tolerance)
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    const lines: TextItemWithPos[][] = [];
    items.forEach((item) => {
      let placed = false;
      for (const line of lines) {
        if (Math.abs(line[0].y - item.y) <= 5.0) {
          line.push(item);
          placed = true;
          break;
        }
      }
      if (!placed) {
        lines.push([item]);
      }
    });

    // Sort each line horizontally from left to right
    const formattedLines = lines.map((line) => {
      line.sort((a, b) => a.x - b.x);
      return line.map((item) => item.str.trim()).join(' ');
    });

    pageTexts.push(formattedLines.join('\n'));

    if (onProgress) {
      onProgress(pageNum, pageCount);
    }
  }

  const fullText = pageTexts.join('\n\n');
  return { text: fullText, pageCount };
}
