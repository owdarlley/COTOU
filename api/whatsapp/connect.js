// Vercel serverless — cria instância WhatsApp e retorna QR Code (Evolution API v2)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.json({ ok: false, demo: true, message: 'Evolution API não configurada no Vercel.' });
  }

  const { instanceName } = req.body || {};
  if (!instanceName) return res.status(400).json({ ok: false, message: 'instanceName obrigatório.' });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  try {
    // Verifica se instância já existe e está conectada
    const checkRes = await fetch(
      `${apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      { headers: { apikey: apiKey } }
    ).catch(() => null);

    if (checkRes?.ok) {
      const instances = await checkRes.json().catch(() => []);
      const found = Array.isArray(instances) && instances.find(
        i => i.instance?.instanceName === instanceName || i.instanceName === instanceName
      );
      const status = found?.instance?.connectionStatus || found?.connectionStatus;
      if (status === 'open') {
        // Já está conectada — não deletar, apenas confirmar
        return res.json({ ok: true, alreadyConnected: true });
      }
    }

    // Não está conectada — deleta (se existir) e recria para QR fresco
    await fetch(`${apiUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { apikey: apiKey },
    }).catch(() => {});

    await sleep(1000);

    await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });

    await sleep(1500);

    const qrRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      headers: { apikey: apiKey },
    });
    const qrData = await qrRes.json();

    const qrcode = qrData.base64 || null;
    if (!qrcode) {
      return res.json({ ok: false, message: 'QR Code não disponível após recriar a instância.' });
    }

    return res.json({ ok: true, qrcode });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
