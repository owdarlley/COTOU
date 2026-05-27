// Vercel serverless — verifica status e retorna QR Code via Z-API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) {
    return res.json({ ok: false, demo: true, message: 'Z-API não configurada.' });
  }

  const base = `https://api.z-api.io/instances/${instanceId}/token/${token}`;

  async function ft(url, opts = {}, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    catch (e) { return null; }
    finally { clearTimeout(t); }
  }

  function normalizeQR(v) {
    if (!v) return null;
    if (v.startsWith('http') || v.startsWith('data:')) return v;
    return `data:image/png;base64,${v}`;
  }

  try {
    // Verifica se já está conectado
    const statusRes = await ft(`${base}/status`);
    if (statusRes && statusRes.ok) {
      const s = await statusRes.json().catch(() => ({}));
      if (s.connected) return res.json({ ok: true, alreadyConnected: true });
    }

    // Busca QR Code para conectar
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
