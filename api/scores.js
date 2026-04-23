// api/scores.js — Vercel Blob storage
// Persists: scores, focus areas, snapshots, and custom agent names.

const BLOB_FILENAME = 'cooper-scores.json';

function getBlobConfig() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  return { token };
}

async function blobGet(config) {
  const listRes = await fetch(
    `https://blob.vercel-storage.com?prefix=${encodeURIComponent(BLOB_FILENAME)}&limit=1`,
    { headers: { Authorization: `Bearer ${config.token}` } }
  );
  if (!listRes.ok) throw new Error(`Blob LIST ${listRes.status}: ${await listRes.text()}`);
  const list = await listRes.json();
  if (!list.blobs || list.blobs.length === 0) return null;
  const res = await fetch(list.blobs[0].url, {
    headers: { Authorization: `Bearer ${config.token}` },
  });
  if (!res.ok) throw new Error(`Blob GET ${res.status}`);
  return res.json();
}

async function blobPut(config, data) {
  const res = await fetch(`https://blob.vercel-storage.com/${BLOB_FILENAME}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'x-api-version': '7',
      'x-add-random-suffix': '0',
      'x-cache-control-max-age': '0',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Blob PUT ${res.status}: ${text}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  const config = getBlobConfig();
  if (!config) {
    return res.status(500).json({
      error: 'BLOB_READ_WRITE_TOKEN not found. Connect a Blob store in Vercel dashboard.',
    });
  }

  if (req.method === 'GET') {
    try {
      const data = await blobGet(config);
      return res.status(200).json({
        scores:      data?.scores      || {},
        focus:       data?.focus       || {},
        snapshots:   data?.snapshots   || [],
        agents:      data?.agents      || [],
        agentOwners: data?.agentOwners || {},
        cooperOwners:data?.cooperOwners|| {},
      });
    } catch (e) {
      return res.status(500).json({ scores: {}, focus: {}, snapshots: [], agents: [], error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      await blobPut(config, {
        scores:      body.scores      || {},
        focus:       body.focus       || {},
        snapshots:   body.snapshots   || [],
        agents:      body.agents      || [],
        agentOwners: body.agentOwners || {},
        cooperOwners:body.cooperOwners|| {},
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
