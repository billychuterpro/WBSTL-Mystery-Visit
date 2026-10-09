import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Schema, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  // Middleware for parsing JSON payloads up to 25MB (for base64 encoded PDF reports)
  app.use(express.json({ limit: '25mb' }));

  // Initialize server-side document processing SDK
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Generic White-Labeled Cloud Document Processing Route
  const handleDocumentExtraction = async (req: express.Request, res: express.Response) => {
    try {
      const { pdfBase64, filename } = req.body;

      if (!pdfBase64) {
        return res.status(400).json({ error: 'No document data provided for processing.' });
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
      if (!apiKey) {
        return res.status(500).json({ error: 'Cloud Document Processing key is missing from server configuration.' });
      }

      // 1. Sanitize base64 string completely (remove prefix and all whitespace/newlines)
      const cleanBase64 = pdfBase64
        .replace(/^data:application\/pdf;base64,/, '')
        .replace(/\s+/g, '');

      // 2. Prompt engineering instruction
      const systemInstructionText = 'You are a precision data extraction engine. Analyze the PDF and locate the SECTION SCORES doughnut charts. Extract the actual score, possible score, and percentage for F&B: Food Hall, F&B: Backlot, and F&B: Butterbeer. Calculate cateringOverall mathematically by summing the actual and possible scores of ONLY these three areas. You MUST return ONLY a raw JSON object matching this exact structure, with no markdown formatting: {"visitDate": "YYYY-MM-DD", "periodNumber": 5, "visitNumber": 1, "cateringOverall": {"actual": 142, "possible": 173, "percentage": 82.1}, "food_hall": {"actual": 47, "possible": 56, "percentage": 84.0}, "backlot": {"actual": 54, "possible": 57, "percentage": 94.7}, "butterbeer": {"actual": 56, "possible": 56, "percentage": 100.0}}';

      // 3. Minimalist REST Payload Structure (Strictly compliant with Gemini REST API)
      const requestPayload = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: cleanBase64,
                },
              },
              {
                text: `${systemInstructionText}\n\nExtract the section scores and audit metrics from this PDF document as specified.`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      };

      // 4. Direct REST Authentication with Model Fallback
      const modelsToTry = ['gemini-1.5-flash', 'gemini-2.5-flash'];
      let apiResponse: Response | null = null;
      let lastErrorText = '';

      for (const model of modelsToTry) {
        const endpointUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        
        try {
          const res = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(requestPayload),
          });

          if (res.ok) {
            apiResponse = res;
            break;
          } else {
            lastErrorText = await res.text();
            console.warn(`Cloud Document Processing attempt with ${model} failed (${res.status}):`, lastErrorText);
          }
        } catch (fetchErr: any) {
          lastErrorText = fetchErr?.message || String(fetchErr);
          console.warn(`Cloud Document Processing request error with ${model}:`, lastErrorText);
        }
      }

      if (!apiResponse || !apiResponse.ok) {
        console.error('Cloud Document Processing REST Error:', lastErrorText);
        return res.status(500).json({ error: 'Cloud Document Processing failed to extract report data.' });
      }

      const responseData = await apiResponse.json();
      const rawText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return res.status(500).json({ error: 'Cloud Document Processing returned an empty result.' });
      }

      // 5. Data Handling: Parse string into JSON and normalize fields
      const cleanedJsonText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const extractedData = JSON.parse(cleanedJsonText);

      // Populate cateringOverallScore, overallScore & areas array for full UI compatibility
      if (extractedData.food_hall && extractedData.backlot && extractedData.butterbeer) {
        const fhAct = Number(extractedData.food_hall.actual) || 0;
        const fhPos = Number(extractedData.food_hall.possible) || 0;
        const blAct = Number(extractedData.backlot.actual) || 0;
        const blPos = Number(extractedData.backlot.possible) || 0;
        const bbAct = Number(extractedData.butterbeer.actual) || 0;
        const bbPos = Number(extractedData.butterbeer.possible) || 0;

        const totalAct = fhAct + blAct + bbAct;
        const totalPos = fhPos + blPos + bbPos;
        const totalPct = totalPos > 0 ? Math.round((totalAct / totalPos) * 1000) / 10 : 0;

        extractedData.cateringOverall = {
          actual: totalAct,
          possible: totalPos,
          percentage: totalPct,
        };
        extractedData.cateringOverallScore = extractedData.cateringOverall;
        extractedData.overallScore = extractedData.cateringOverall;

        extractedData.areas = [
          {
            areaId: 'food_hall',
            areaName: 'F&B: Food Hall',
            actualScore: fhAct,
            possibleScore: fhPos,
            reportPercentage: fhPos > 0 ? Math.round((fhAct / fhPos) * 1000) / 10 : 0,
            time: extractedData.food_hall.time || '12:00',
            spend: extractedData.food_hall.spend || 0,
            allergyChecked: true,
            staffMembers: [],
            staffName: '',
            narrative: '',
            friendlyGreeting: '100%',
            queueManagement: '100%',
            additionalOffered: '100%',
            expectationsExceeded: '100%',
          },
          {
            areaId: 'backlot',
            areaName: 'F&B: Backlot',
            actualScore: blAct,
            possibleScore: blPos,
            reportPercentage: blPos > 0 ? Math.round((blAct / blPos) * 1000) / 10 : 0,
            time: extractedData.backlot.time || '13:00',
            spend: extractedData.backlot.spend || 0,
            allergyChecked: true,
            staffMembers: [],
            staffName: '',
            narrative: '',
            friendlyGreeting: '100%',
            queueManagement: '100%',
            additionalOffered: '100%',
            expectationsExceeded: '100%',
          },
          {
            areaId: 'butterbeer',
            areaName: 'F&B: Butterbeer',
            actualScore: bbAct,
            possibleScore: bbPos,
            reportPercentage: bbPos > 0 ? Math.round((bbAct / bbPos) * 1000) / 10 : 0,
            time: extractedData.butterbeer.time || '14:00',
            spend: extractedData.butterbeer.spend || 0,
            allergyChecked: true,
            staffMembers: [],
            staffName: '',
            narrative: '',
            friendlyGreeting: '100%',
            queueManagement: '100%',
            additionalOffered: '100%',
            expectationsExceeded: '100%',
          },
        ];
      }

      return res.json({
        success: true,
        data: extractedData,
      });
    } catch (err: any) {
      console.error('Cloud Document Processing Error:', err?.message || err);
      return res.status(500).json({
        error: 'Cloud Document Processing Error: Failed to process document.',
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
    console.log(`Cloud Document Processing Engine listening on port ${PORT}`);
  });
}

startServer();
