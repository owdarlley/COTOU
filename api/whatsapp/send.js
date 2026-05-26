// Vercel serverless — envia mensagem WhatsApp via Evolution API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.json({ ok: true, demo: true, message: 'Mensagem enviada (modo demo — Evolution API não configurada).' });
  }

  const { phone, message, instanceName } = req.body || {};
  if (!phone || !message) return res.status(400).json({ ok: false, message: 'phone e message são obrigatórios.' });

  const instance = instanceName || process.env.WHATSAPP_INSTANCE_NAME;
  if (!instance) return res.status(400).json({ ok: false, message: 'instanceName ou WHATSAPP_INSTANCE_NAME obrigatório.' });

  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('55') ? digits : `55${digits}`;

  try {
    const r = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ number, text: message }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok: false, message: data.message || 'Erro ao enviar.' });
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
