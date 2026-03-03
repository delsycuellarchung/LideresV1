import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Request received:', req.method);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Prefer DB when available
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('imports')
        .select('content, saved_at')
        .order('saved_at', { ascending: false })
        .limit(1);
      if (!error && data && (data as any[]).length > 0) {
        return res.status(200).json((data as any[])[0].content);
      }
    } catch (dbErr) {
      console.warn('/api/import-last supabase read failed, falling back to file', dbErr);
    }
  }

  const filePath = './uploads-debug/last-import.json';
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No local import data found' });
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return res.status(200).json(data);
  } catch (err) {
    console.error('API /api/import-last error', err);
    return res.status(500).json({ error: 'Could not read local import data' });
  }
}
