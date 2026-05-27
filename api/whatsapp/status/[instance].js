// Vercel serverless — status de conexão via Z-API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const instanceId = req.query?.zapiInstanceId || process.env.ZAPI_INSTANCE_ID;
  const token = req.query?.zapiToken || process.env.ZAPI_TOKEN;
  const clientToken = req.query?.zapiClientToken || process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) return res.json({ connected: false, noCredentials: true });

  const headers = clientToken ? { 'Client-Token': clientToken } : {};

  try {
    const r = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/status`,
      { headers, signal: AbortSignal.timeout(8000) }
    );
    const data = await r.json().catch(() => ({}));
    return res.json({ connected: data.connected === true, state: data.connected ? 'open' : 'close' });
  } catch (err) {
    return res.json({ connected: false, message: err.message });
  }
};
