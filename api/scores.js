// Vercel Serverless Function — handles GET and POST for score persistence
import { kv } from '@vercel/kv';

const STORE_KEY = 'agent_scorecard_scores';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const data = await kv.get(STORE_KEY);
      return res.status(200).json({ scores: data || {} });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to load scores', detail: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { scores } = req.body;
      if (!scores || typeof scores !== 'object') {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      await kv.set(STORE_KEY, scores);
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: 'Failed to save scores', detail: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
