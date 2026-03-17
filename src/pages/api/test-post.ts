import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API /api/test-post - request received', { method: req.method, timestamp: new Date().toISOString() });
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return res.status(200).json({ ok: true, message: 'POST works!' });
}
