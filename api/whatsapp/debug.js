// Endpoint temporário de debug — ver resposta bruta da Z-API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Aceita credenciais por query param ou env vars
  const instanceId = req.query.instanceId || process.env.ZAPI_INSTANCE_ID;
  const token = req.query.token || process.env.ZAPI_TOKEN;
  const clientToken = req.query.clientToken || process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) return res.json({ error: 'Passe ?instanceId=...&token=... ou configure as env vars' });

  const base = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
  const headers = clientToken ? { 'Client-Token': clientToken } : {};

  try {
    // 1. Status
    const stRes = await fetch(`${base}/status`, { headers, signal: AbortSignal.timeout(6000) });
    const stJson = await stRes.json().catch(() => ({}));

    // 2. QR code
    const qrRes = await fetch(`${base}/qr-code`, { headers, signal: AbortSignal.timeout(8000) });
    const qrRaw = await qrRes.text();
    let qrParsed = null;
    try { qrParsed = JSON.parse(qrRaw); } catch (_) {}

    const value = qrParsed?.value || qrParsed?.base64 || qrParsed?.qrcode || null;

    let valueType = 'no-value';
    if (value) {
      if (value.startsWith('data:image')) valueType = 'data-uri-image';
      else if (value.startsWith('data:')) valueType = `data-uri-other(${value.slice(5, 20)})`;
      else if (value.startsWith('http')) valueType = `url(${value.slice(0, 60)})`;
      else if (/^[A-Za-z0-9+/]{20,}={0,2}$/.test(value.slice(0, 40))) valueType = 'base64-string';
      else valueType = `unknown-starts-with(${JSON.stringify(value.slice(0, 30))})`;
    }

    return res.json({
      status: { connected: stJson.connected, state: stJson.state },
      qr: {
        httpStatus: qrRes.status,
        contentType: qrRes.headers.get('content-type'),
        parsedKeys: qrParsed ? Object.keys(qrParsed) : null,
        valueType,
        valueLength: value ? value.length : 0,
        valuePreview: value ? value.slice(0, 80) : null,
      },
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
};
