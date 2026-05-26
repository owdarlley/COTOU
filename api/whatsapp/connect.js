// Vercel serverless — cria instância WhatsApp e retorna QR Code
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

  try {
    const createRes = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });
    await createRes.json();

    const qrRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      headers: { apikey: apiKey },
    });
    const qrData = await qrRes.json();

    return res.json({ ok: true, qrcode: qrData.base64 || qrData.qrcode?.base64 || null });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
