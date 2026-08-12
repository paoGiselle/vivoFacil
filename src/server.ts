import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import { GoogleGenAI } from '@google/genai';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json({ limit: '10mb' }));

const angularApp = new AngularNodeAppEngine();

// Lazy Gemini AI initialization
let aiClient: GoogleGenAI | null = null;
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * OCR API for Extracting Bank Transfer Voucher Details
 */
app.post('/api/ocr-voucher', async (req, res) => {
  try {
    const { imageBase64, rawText } = req.body;

    const ai = getGenAIClient();

    if (ai && imageBase64) {
      try {
        const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: `Analiza este comprobante de transferencia bancaria / depósitos de México y extrae ÚNICAMENTE los datos reales presentes en la imagen en este formato JSON exacto:
{
  "banco": "Nombre exacto del banco emisor / ordenante si se observa en la imagen, de lo contrario texto vacío",
  "bancoReceptor": "Nombre del banco receptor / destino si se observa en la imagen, de lo contrario texto vacío",
  "fecha": "Fecha de operación en formato AAAA-MM-DD si se observa en la imagen, de lo contrario texto vacío",
  "hora": "Hora HH:MM si se observa en la imagen, de lo contrario texto vacío",
  "monto": Número decimal con la cantidad exacta transferida si se observa en la imagen, de lo contrario 0,
  "referencia": "Folio, Clave de Rastreo o Referencia de operación si se observa en la imagen, de lo contrario texto vacío",
  "concepto": "Concepto o motivo de pago si se observa en la imagen, de lo contrario texto vacío",
  "beneficiario": "Nombre del beneficiario / persona o entidad que recibe si se observa en la imagen, de lo contrario texto vacío",
  "cuentaOrigen": "Cuenta u ordenante / CLABE de origen si se observa en la imagen, de lo contrario texto vacío",
  "cuentaDestino": "Cuenta o CLABE destino si se observa en la imagen, de lo contrario texto vacío",
  "confianza": Número del 0 al 100 indicando certeza de lectura,
  "resumen": "Resumen legible de los datos reales extraídos"
}
REGLA STRICTA: NO INVENTES, NO SIMULES, NO USAR VALORES POR DEFECTO. Si un dato no es legible con claridad en la imagen, devuelve texto vacío para cadenas y 0 para números.`,
            },
          ],
        });

        const textOutput = response.text || '';
        const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({ success: true, data: parsed, method: 'gemini-ocr' });
        }
      } catch (err) {
        console.warn('Gemini OCR fallback to rule engine:', err);
      }
    }

    // Heuristic & Regex Rule OCR Engine fallback for Mexican Banking Vouchers
    const textToAnalyze = rawText || imageBase64 || '';
    let banco = '';
    if (/banamex|citibanamex/i.test(textToAnalyze)) banco = 'CitiBanamex';
    else if (/santander/i.test(textToAnalyze)) banco = 'Santander';
    else if (/banregio/i.test(textToAnalyze)) banco = 'Banregio';
    else if (/hsbc/i.test(textToAnalyze)) banco = 'HSBC';
    else if (/nu\b|nubank/i.test(textToAnalyze)) banco = 'Nu México';
    else if (/mercado\s*pago/i.test(textToAnalyze)) banco = 'Mercado Pago';
    else if (/banorte/i.test(textToAnalyze)) banco = 'Banorte';
    else if (/bbva|bancomer/i.test(textToAnalyze)) banco = 'BBVA México';
    else if (/spei/i.test(textToAnalyze)) banco = 'SPEI / Banxico';

    const dateMatch = textToAnalyze.match(/(\d{2,4})[-/. ](\d{1,2})[-/. ](\d{2,4})/);
    const timeMatch = textToAnalyze.match(/(\d{1,2}):(\d{2})/);
    const amountMatch = textToAnalyze.match(/(\$?\s*[\d,]+\.\d{2})/);
    const refMatch = textToAnalyze.match(/(folio|referencia|clave|rastreo|operaci[oó]n)[:\s]*([a-zA-Z0-9]+)/i);

    const formattedDate = dateMatch 
      ? (dateMatch[1].length === 4 ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}` : `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`)
      : '';

    const extractedAmount = amountMatch 
      ? parseFloat(amountMatch[1].replace(/[^\d.]/g, ''))
      : 0;

    const extractedRef = refMatch ? refMatch[2] : '';
    const extractedTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : '';

    return res.json({
      success: true,
      data: {
        banco,
        fecha: formattedDate,
        hora: extractedTime,
        monto: extractedAmount,
        referencia: extractedRef,
        confianza: (banco || formattedDate || extractedAmount) ? 80 : 0,
        resumen: (banco || formattedDate || extractedAmount) 
          ? `Datos reconocidos del comprobante.` 
          : 'No se identificaron datos automáticos. Por favor complete los campos.',
      },
      method: 'heuristic-ocr'
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error procesando comprobante';
    return res.status(500).json({ success: false, error: msg });
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
