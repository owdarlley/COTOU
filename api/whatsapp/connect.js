// Vercel serverless — verifica status e retorna QR Code via Z-API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const instanceId = req.body?.zapiInstanceId || process.env.ZAPI_INSTANCE_ID;
  const token = req.body?.zapiToken || process.env.ZAPI_TOKEN;
  const clientToken = req.body?.zapiClientToken || process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    return res.json({ ok: false, noCredentials: true, message: 'Credenciais Z-API não configuradas para este usuário.' });
  }

  const base = `https://api.z-api.io/instances/${instanceId}/token/${token}`;
  const headers = clientToken ? { 'Client-Token': clientToken } : {};

  async function ft(url, opts = {}, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, headers: { ...headers, ...opts.headers }, signal: ctrl.signal }); }
    catch (e) { return null; }
    finally { clearTimeout(t); }
  }

  function normalizeQR(v) {
    if (!v) return null;
    if (v.startsWith('http') || v.startsWith('data:')) return v;
    return `data:image/png;base64,${v}`;
  }

  try {
    const statusRes = await ft(`${base}/status`);
    if (statusRes && statusRes.ok) {
      const s = await statusRes.json().catch(() => ({}));
      if (s.connected) return res.json({ ok: true, alreadyConnected: true });
    }

    const qrRes = await ft(`${base}/qr-code`);
    if (qrRes && qrRes.ok) {
      const qrData = await qrRes.json().catch(() => ({}));
      const raw = qrData?.value || qrData?.base64 || qrData?.qrcode;
      if (raw) return res.json({ ok: true, qrcode: normalizeQR(raw) });
    }

    return res.json({ ok: true, pending: true });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
