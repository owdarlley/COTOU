// Endpoint temporário de debug — ver resposta bruta da Z-API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) return res.json({ error: 'env vars missing' });

  const base = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
  const headers = clientToken ? { 'Client-Token': clientToken } : {};

  try {
    const qrRes = await fetch(`${base}/qr-code`, { headers, signal: AbortSignal.timeout(8000) });
    const raw = await qrRes.text();
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch (_) {}

    const value = parsed?.value || parsed?.base64 || parsed?.qrcode || null;
    return res.json({
      status: qrRes.status,
      contentType: qrRes.headers.get('content-type'),
      rawLength: raw.length,
      rawPreview: raw.slice(0, 200),
      parsedKeys: parsed ? Object.keys(parsed) : null,
      valueType: value ? (
        value.startsWith('data:') ? 'data-uri' :
        value.startsWith('http') ? 'url' :
        value.startsWith('iVBOR') ? 'base64-png' :
        value.startsWith('/9j/') ? 'base64-jpeg' :
        `other:${value.slice(0, 30)}`
      ) : 'no-value',
      valueLength: value ? value.length : 0,
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
