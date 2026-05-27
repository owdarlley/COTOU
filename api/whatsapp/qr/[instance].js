// Vercel serverless — busca QR Code de instância existente (Evolution API v2)
// Usado pelo frontend para polling após connect retornar { pending: true }
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  if (!apiUrl || !apiKey) return res.json({ ok: false, message: 'Env vars ausentes.' });

  const { instance } = req.query;
  if (!instance) return res.status(400).json({ ok: false, message: 'instance obrigatorio.' });

  const h = { 'Content-Type': 'application/json', apikey: apiKey };

  try {
    // Verifica se já conectou
    const stateRes = await fetch(
      apiUrl + '/instance/fetchInstances?instanceName=' + encodeURIComponent(instance),
      { headers: h }
    ).catch(() => null);

    if (stateRes && stateRes.ok) {
      const list = await stateRes.json().catch(() => []);
      const found = Array.isArray(list) ? list.find(
        i => (i.name || i.instanceName || i.instance?.instanceName) === instance
      ) : null;
      const status = found?.connectionStatus || found?.instance?.connectionStatus;
      if (status === 'open') {
        return res.json({ ok: true, connected: true });
      }
    }

    // Busca QR
    const qrRes = await fetch(apiUrl + '/instance/connect/' + instance, { headers: h });
    if (!qrRes.ok) {
      return res.json({ ok: false, message: 'Instancia nao encontrada.' });
    }
    const qrData = await qrRes.json();

    if (qrData?.base64 && qrData.base64.startsWith('data:')) {
      return res.json({ ok: true, qrcode: qrData.base64 });
    }

    // QR ainda nao disponivel
    return res.json({ ok: true, pending: true });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
