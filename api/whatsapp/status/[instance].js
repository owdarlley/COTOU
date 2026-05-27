// Vercel serverless — status de conexão via Z-API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) return res.json({ connected: false, demo: true });

  try {
    const r = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/status`,
      { signal: AbortSignal.timeout(8000) }
    );
    const data = await r.json().catch(() => ({}));
    return res.json({ connected: data.connected === true, state: data.connected ? 'open' : 'close' });
  } catch (err) {
    return res.json({ connected: false, message: err.message });
  }
};
