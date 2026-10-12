import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseMysteryShopperReport } from './src/services/reportParser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface TextItemWithPos {
  str: string;
  x: number;
  y: number;
}

/**
 * Extracts plain text from an uploaded PDF buffer using pdfjs-dist.
 * Reconstructs lines by visual Y and X positions for accurate layout parsing.
 */
async function extractTextFromPDFBuffer(buffer: Buffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    useSystemFonts: true,
  });

  const pdfDocument = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: TextItemWithPos[] = textContent.items
      .filter((item: any) => typeof item.str === 'string' && item.str.trim().length > 0)
      .map((item: any) => ({
        str: item.str,
        x: item.transform[4] || 0,
        y: item.transform[5] || 0,
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
  }

  return pageTexts.join('\n\n');
}

async function startServer() {
  const app = express();

  // Middleware for parsing JSON payloads up to 25MB (for base64 encoded PDF reports)
  app.use(express.json({ limit: '25mb' }));

  // Deterministic local document processing route using pdfjs-dist and regex parser
  const handleDocumentExtraction = async (req: express.Request, res: express.Response) => {
    try {
      const { pdfBase64, filename } = req.body;

      if (!pdfBase64) {
        return res.status(400).json({ error: 'No document data provided for processing.' });
      }

      // 1. Sanitize base64 string (strip data URI prefix and all whitespace)
      const cleanBase64 = pdfBase64
        .replace(/^data:application\/pdf;base64,/, '')
        .replace(/\s+/g, '');

      const buffer = Buffer.from(cleanBase64, 'base64');

      // 2. Extract plain text directly using local pdfjs-dist
      const extractedText = await extractTextFromPDFBuffer(buffer);

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({
          error: 'Unable to extract text from the provided PDF document. Please check the file format.',
        });
      }

      // 3. Parse report text deterministically using the existing regex parser
      const parsedResult = parseMysteryShopperReport(
        extractedText,
        filename || 'uploaded_mystery_shopper_report.pdf'
      );

      // 4. Return exact contract expected by frontend Ingest Shopper Report modal
      return res.json({
        success: true,
        data: parsedResult,
      });
    } catch (err: any) {
      console.error('Local Document Processing Error:', err?.message || err);
      return res.status(500).json({
        error: 'Document Processing Error: Failed to extract and parse PDF report locally.',
      });
    }
  };

  app.post('/api/process-document', handleDocumentExtraction);
  app.post('/api/extract-report', handleDocumentExtraction);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Document Processing Engine listening on port ${PORT}`);
  });
}

startServer();
