import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { processImportRows } from '@/lib/importProcessor';

export const config = {
  api: {
    bodyParser: false,
  },
};

const getRawBody = (req: NextApiRequest): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', (err) => reject(err));
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  console.log('API /api/import-stream - request headers', { 'x-filename': req.headers['x-filename'], 'content-type': req.headers['content-type'] });
  console.log('Request received:', req.method, req.headers);
  console.log('Request body:', req.body);
  if (String(process.env.FORCE_SAVE_UPLOAD || '').toLowerCase() === 'true') {
    try {
      const uploadsDir = './uploads-debug';
      try { fs.mkdirSync(uploadsDir); } catch (e) { }
      const fname = `stream-${Date.now()}.bin`;
      const outPath = `${uploadsDir}/${fname}`;
      console.log('API /api/import-stream - FORCE_SAVE_UPLOAD active, saving raw body to', outPath);
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(Buffer.from(c)));
      req.on('end', () => {
        try { fs.writeFileSync(outPath, Buffer.concat(chunks)); } catch (e) { console.error('write error', e); }
        return res.status(200).json({ saved: outPath, size: Buffer.concat(chunks).length });
      });
      req.on('error', (e) => { console.error('req error', e); return res.status(500).json({ error: String(e?.message || e) }); });
      return;
    } catch (e) {
      console.error('API /api/import-stream - FORCE_SAVE_UPLOAD failed', e);
    }
  }
  try {
    const filename = String(req.headers['x-filename'] || 'upload.xlsx');
    const buffer = await getRawBody(req as any);
    if (!buffer || buffer.length === 0) return res.status(400).json({ error: 'Empty body' });

    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];

    // If requested, skip DB operations to allow testing without DB
    if (String(process.env.DISABLE_DB || '').toLowerCase() === 'true') {
      console.log('API /api/import-stream - DISABLE_DB=true, skipping DB upserts. Rows:', jsonData.length);
      try {
        const debugDir = './uploads-debug';
        try { fs.mkdirSync(debugDir, { recursive: true }); } catch { /* ignore */ }
        fs.writeFileSync(`${debugDir}/last-import.json`, JSON.stringify({ rows: jsonData, savedAt: new Date().toISOString() }));
      } catch (writeErr) {
        console.warn('API /api/import-stream - could not persist last import', writeErr);
      }
      return res.status(200).json({ inserted: jsonData.length, preview: true, rows: jsonData });
    }

    // Fix supabase null type error
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client is not initialized' });
    }
    const insertados = await processImportRows(jsonData as Record<string, unknown>[], supabase);
    return res.status(200).json({ inserted: insertados });
  } catch (err: any) {
    console.error('API import-stream error', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
