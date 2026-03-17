import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API /api/health - ping received', { method: req.method, timestamp: new Date().toISOString() });
  return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
}
