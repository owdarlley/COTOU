// Vercel serverless — cria instância WhatsApp e retorna QR Code (Evolution API v2)
// fix: polling robusto, lookup correto de status, timeout seguro para Vercel
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.json({ ok: false, demo: true, message: 'Env vars ausentes.' });
  }

  const { instanceName } = req.body || {};
  if (!instanceName) return res.status(400).json({ ok: false, message: 'instanceName obrigatorio.' });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const h = { 'Content-Type': 'application/json', apikey: apiKey };

  try {
    // 1. Verifica estado atual
    const checkRes = await fetch(
      apiUrl + '/instance/fetchInstances?instanceName=' + encodeURIComponent(instanceName),
      { headers: h }
    ).catch(() => null);

    if (checkRes && checkRes.ok) {
      const list = await checkRes.json().catch(() => []);
      const found = Array.isArray(list) ? list.find(
        i => (i.name || i.instanceName || i.instance?.instanceName) === instanceName
      ) : null;
      const status = found?.connectionStatus || found?.instance?.connectionStatus;

      if (status === 'open') {
        return res.json({ ok: true, alreadyConnected: true });
      }
      if (found) {
        await fetch(apiUrl + '/instance/delete/' + instanceName, { method: 'DELETE', headers: h }).catch(() => {});
        await sleep(1200);
      }
    }

    // 2. Cria instância
    const createRes = await fetch(apiUrl + '/instance/create', {
      method: 'POST', headers: h,
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });
    if (!createRes.ok) {
      const e = await createRes.json().catch(() => ({}));
      return res.status(502).json({ ok: false, message: 'Erro ao criar: ' + JSON.stringify(e) });
    }
    const createData = await createRes.json();

    // 3. QR na resposta de criacao
    const qrOnCreate = createData?.qrcode?.base64;
    if (qrOnCreate && qrOnCreate.startsWith('data:')) {
      return res.json({ ok: true, qrcode: qrOnCreate });
    }

    // 4. Polling seguro: 4x1800ms = ~7.2s (dentro do limite Vercel free)
    for (let i = 0; i < 4; i++) {
      await sleep(1800);
      try {
        const r = await fetch(apiUrl + '/instance/connect/' + instanceName, { headers: h });
        if (r.ok) {
          const d = await r.json();
          if (d?.base64 && d.base64.startsWith('data:')) {
            return res.json({ ok: true, qrcode: d.base64 });
          }
        }
      } catch (_) {}
    }

    // 5. Ainda sem QR — retorna pending para frontend pollar via /api/whatsapp/qr
    return res.json({ ok: true, pending: true, instanceName });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
