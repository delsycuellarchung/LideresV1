import type { NextApiRequest, NextApiResponse } from 'next';
import Busboy from 'busboy';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { processImportRows } from '@/lib/importProcessor';

export const config = {
  api: {
    bodyParser: false,
  },
};

type UploadedFile = {
  fieldName: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  size: number;
};

const parseMultipart = (req: NextApiRequest): Promise<{ fields: Record<string, string>; files: UploadedFile[] }> => {
  return new Promise((resolve, reject) => {
    try {
      const bb = new Busboy({ headers: req.headers as any });
      const fields: Record<string, string> = {};
      const files: UploadedFile[] = [];

      bb.on('field', (name: string, val: string) => {
        fields[name] = val;
      });

      bb.on('file', (name: string, fileStream: NodeJS.ReadableStream, info: { filename: string; encoding: string; mimeType: string }) => {
        const { filename, mimeType } = info;
        const chunks: Buffer[] = [];
        fileStream.on('data', (d: Buffer) => chunks.push(Buffer.from(d)));
        fileStream.on('error', (e: Error) => reject(e));
        fileStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          files.push({ fieldName: name, filename, mimeType, buffer, size: buffer.length });
        });
      });

      bb.on('error', (e: Error) => reject(e));
      bb.on('finish', () => resolve({ fields, files }));
      req.pipe(bb as any);
    } catch (e) {
      reject(e);
    }
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const disableDb = String(process.env.DISABLE_DB || 'true').toLowerCase() === 'true';
  try {
    const ct = String(req.headers['content-type'] || '');
    if (!ct.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Contenido invalido, se espera multipart/form-data' });
    }

    const parsed = await parseMultipart(req);
    const file = parsed.files.find((f) => f.fieldName === 'file' || f.fieldName === 'archivo') ?? parsed.files[0];
    if (!file || !file.buffer || file.size === 0) {
      return res.status(400).json({ error: 'No se recibio ningun archivo valido' });
    }

    let jsonData: Record<string, unknown>[] = [];
    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        return res.status(400).json({ error: 'El archivo Excel no contiene hojas válidas' });
      }
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        return res.status(400).json({ error: `No se pudo encontrar la hoja: ${sheetName}` });
      }
      jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null }) as Record<string, unknown>[];
      if (jsonData.length === 0) {
        return res.status(400).json({ error: 'El archivo Excel está vacío o no contiene datos válidos' });
      }
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('EBUSY') || error.message.includes('EPERM')) {
        return res.status(400).json({
          error: 'El archivo está siendo utilizado por otra aplicación. Por favor, ciérralo e inténtalo de nuevo.',
        });
      }
      return res.status(400).json({ error: 'No se pudo leer el archivo Excel', details: error.message });
    }

    if (disableDb) {
      try {
        const debugDir = './uploads-debug';
        try { fs.mkdirSync(debugDir, { recursive: true }); } catch { /* ignore */ }
        fs.writeFileSync(`${debugDir}/last-import.json`, JSON.stringify({ rows: jsonData, savedAt: new Date().toISOString() }));
      } catch (writeErr) {
        console.warn('API /api/import - no se pudo guardar el ultimo import', writeErr);
      }
      return res.status(200).json({ inserted: jsonData.length, preview: true, rows: jsonData });
    }

    // Asegurarse de que el cliente de Supabase no se use
    if (!supabase) {
      return res.status(500).json({ error: 'El cliente de Supabase no esta inicializado' });
    }
    const insertados = await processImportRows(jsonData as Record<string, unknown>[], supabase);
    return res.status(200).json({ inserted: insertados });
  } catch (err: any) {
    console.error('API import error', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
