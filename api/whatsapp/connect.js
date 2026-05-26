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

  try {
    // Tenta criar a instância — ignora erro se já existir
    await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });

    // Busca QR Code — v2 retorna { base64: "data:image/png;base64,..." }
    const qrRes = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
      headers: { apikey: apiKey },
    });
    const qrData = await qrRes.json();

    // base64 em v2 já vem com o prefixo data:image/png;base64,
    const qrcode = qrData.base64 || null;

    if (!qrcode) {
      return res.json({ ok: false, message: 'QR Code não disponível. Instância pode já estar conectada.' });
    }

    return res.json({ ok: true, qrcode });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
