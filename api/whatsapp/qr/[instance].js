// Vercel serverless — polling de QR Code (Evolution API v2)
// Chamado pelo frontend a cada 5s após connect retornar { pending: true }.
// Se a instância não existir (connect desistiu antes de criá-la), cria aqui.
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

  async function ft(url, opts = {}, ms = 3000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    catch (e) { return null; }
    finally { clearTimeout(t); }
  }

  // Normaliza QR — aceita com ou sem prefixo data:
  function toQR(b64) {
    if (!b64) return null;
    return b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
  }

  // Extrai QR de qualquer campo possível da resposta
  function extractQR(data) {
    return data?.base64 || data?.qrcode?.base64 || data?.qr?.base64 || data?.qrcode || null;
  }

  try {
    // 1. Verifica se já está conectada ou se a instância existe
    const stateRes = await ft(
      apiUrl + '/instance/fetchInstances?instanceName=' + encodeURIComponent(instance),
      { headers: h }
    );

    // Render ainda dormindo — continua polling
    if (!stateRes) return res.json({ ok: true, pending: true });

    const list = await stateRes.json().catch(() => []);
    const found = Array.isArray(list) ? list.find(
      i => (i.name || i.instanceName || i.instance?.instanceName) === instance
    ) : null;
    const status = found?.connectionStatus || found?.instance?.connectionStatus;

    if (status === 'open') return res.json({ ok: true, connected: true });

    if (found) {
      // Instância existe mas não conectada — busca QR
      const qrRes = await ft(apiUrl + '/instance/connect/' + instance, { headers: h }, 2500);
      if (qrRes && qrRes.ok) {
        const qrData = await qrRes.json().catch(() => ({}));
        const raw = extractQR(qrData);
        if (raw) return res.json({ ok: true, qrcode: toQR(raw) });
      }
      return res.json({ ok: true, pending: true });
    }

    // Instância não existe — cria agora
    const createRes = await ft(apiUrl + '/instance/create', {
      method: 'POST', headers: h,
      body: JSON.stringify({ instanceName: instance, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });

    if (!createRes) return res.json({ ok: true, pending: true });

    const createData = await createRes.json().catch(() => ({}));
    const rawCreate = extractQR(createData) || extractQR(createData?.qrcode);
    if (rawCreate) return res.json({ ok: true, qrcode: toQR(rawCreate) });

    // QR não veio na criação — tenta buscar uma vez
    const qrRes2 = await ft(apiUrl + '/instance/connect/' + instance, { headers: h }, 2000);
    if (qrRes2 && qrRes2.ok) {
      const qrData2 = await qrRes2.json().catch(() => ({}));
      const raw2 = extractQR(qrData2);
      if (raw2) return res.json({ ok: true, qrcode: toQR(raw2) });
    }

    return res.json({ ok: true, pending: true });

  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
