import type { NextApiRequest, NextApiResponse } from 'next';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabaseClient';
import { processImportRows } from '@/lib/importProcessor';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Request received:', req.method, req.headers);
  console.log('Request body:', req.body);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { filename, data } = req.body || {};
    if (!data) return res.status(400).json({ error: 'No data provided' });
    // data is base64 string
    const buffer = Buffer.from(data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null }) as any[];

    // If requested, skip DB operations to allow testing without DB
    if (String(process.env.DISABLE_DB || '').toLowerCase() === 'true') {
      console.log('API /api/import-base64 - DISABLE_DB=true, skipping DB upserts. Rows:', jsonData.length);
      try {
        const debugDir = './uploads-debug';
        try { fs.mkdirSync(debugDir, { recursive: true }); } catch { /* ignore */ }
        fs.writeFileSync(`${debugDir}/last-import.json`, JSON.stringify({ rows: jsonData, savedAt: new Date().toISOString() }));
      } catch (writeErr) {
        console.warn('API /api/import-base64 - could not persist last import', writeErr);
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
    console.error('API import-base64 error', err);
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
