// api/scores.js
// Uses Vercel KV REST API directly via fetch — no npm packages needed.
// Requires KV_REST_API_URL and KV_REST_API_TOKEN env vars (auto-set when
// you connect a KV database in the Vercel dashboard).

const KEY = 'cooper_scores';

function getKV() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function kvGet(kv) {
  const res = await fetch(`${kv.url}/get/${KEY}`, {
    headers: { Authorization: `Bearer ${kv.token}` }
  });
  if (!res.ok) throw new Error(`KV GET failed: ${res.status}`);
  const json = await res.json();
  // Upstash returns { result: "stringified-json" } or { result: null }
  if (!json.result) return {};
  return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
}

async function kvSet(kv, data) {
  const res = await fetch(`${kv.url}/set/${KEY}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${kv.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value: JSON.stringify(data) }),
  });
  if (!res.ok) throw new Error(`KV SET failed: ${res.status}`);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const kv = getKV();
  if (!kv) {
    return res.status(500).json({
      error: 'KV not configured. Go to Vercel dashboard → Storage → Create KV Database → connect to this project.'
    });
  }

  if (req.method === 'GET') {
    try {
      const scores = await kvGet(kv);
      return res.status(200).json({ scores });
    } catch (e) {
      return res.status(500).json({ scores: {}, error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await kvSet(kv, body.scores || {});
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
