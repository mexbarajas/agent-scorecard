const STORAGE_KEY = process.env.SCORECARD_STORAGE_KEY || 'agent-scorecard:shared';

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
}

function getKvConfig() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('Vercel KV is not configured (KV_REST_API_URL / KV_REST_API_TOKEN).');
  }
  return { url, token };
}

async function kvGet() {
  const { url, token } = getKvConfig();
  const res = await fetch(`${url}/get/${encodeURIComponent(STORAGE_KEY)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`KV GET failed (${res.status})`);
  const data = await res.json();
  if (!data.result) return null;
  if (typeof data.result === 'string') {
    try {
      return JSON.parse(data.result);
    } catch {
      throw new Error('Stored payload is not valid JSON.');
    }
  }
  return data.result;
}

async function kvSet(value) {
  const { url, token } = getKvConfig();
  const encodedValue = encodeURIComponent(JSON.stringify(value));
  const res = await fetch(`${url}/set/${encodeURIComponent(STORAGE_KEY)}/${encodedValue}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`KV SET failed (${res.status})`);
  const data = await res.json();
  if (data.result !== 'OK') throw new Error('KV SET did not return OK.');
  return true;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const stored = await kvGet();
      return json(res, 200, stored || { scores: {}, ts: null });
    }
    if (req.method === 'PUT') {
      if (!req.body || typeof req.body !== 'object' || !req.body.scores) {
        return json(res, 400, { error: 'Body must include scores object.' });
      }
      await kvSet({ scores: req.body.scores, ts: Date.now() });
      return json(res, 200, { ok: true });
    }
    res.setHeader('Allow', 'GET, PUT');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (err) {
    const message = err.message || 'Unexpected server error.';
    const status = message.includes('not configured') ? 503 : 500;
    return json(res, status, { error: message });
  }
}
