// Vercel serverless — verifica status e retorna QR Code via Z-API
const QRCodeGen = require('qrcode');

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

  async function normalizeQR(v) {
    if (!v) return null;
    if (v.startsWith('data:')) return v;
    if (v.startsWith('http')) {
      // URL wa.me com QR no fragmento: https://wa.me/settings/linked_devices#2@...
      if (v.includes('#')) {
        const qrData = v.split('#')[1];
        if (qrData) {
          try { return await QRCodeGen.toDataURL(qrData, { width: 256, margin: 2 }); } catch (_) {}
        }
      }
      // URL de imagem direta — proxy server-side
      try {
        const r = await ft(v, {}, 6000);
        if (r && r.ok) {
          const buf = await r.arrayBuffer();
          const b64 = Buffer.from(buf).toString('base64');
          const ct = r.headers.get('content-type') || 'image/png';
          if (ct.startsWith('image/')) return `data:${ct};base64,${b64}`;
        }
      } catch (_) {}
      return null;
    }
    // String raw do WhatsApp (ex: "2@ABCD...") — gera imagem QR server-side
    try {
      return await QRCodeGen.toDataURL(v, { width: 256, margin: 2 });
    } catch (_) {
      return null;
    }
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
      if (raw) {
        const qrcode = await normalizeQR(raw);
        if (qrcode) return res.json({ ok: true, qrcode });
      }
    }

    return res.json({ ok: true, pending: true, instanceName: instanceId });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
