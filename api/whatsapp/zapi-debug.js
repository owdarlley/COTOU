// Diagnóstico temporário — mostra resposta bruta da Z-API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) return res.json({ erro: 'Env vars ZAPI não encontradas' });

  const base = `https://api.z-api.io/instances/${instanceId}/token/${token}`;

  async function ft(url, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      const text = await r.text();
      let json = null;
      try { json = JSON.parse(text); } catch (_) {}
      return { status: r.status, ok: r.ok, json, rawPreview: text.substring(0, 300) };
    } catch (e) {
      return { erro: e.message };
    } finally {
      clearTimeout(t);
    }
  }

  return res.json({
    instanceId,
    status:  await ft(`${base}/status`),
    qrCode:  await ft(`${base}/qr-code`),
    qrImage: await ft(`${base}/qr-code/image`),
  });
};
