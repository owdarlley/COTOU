// Vercel serverless — envia mensagem WhatsApp via Z-API
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) {
    return res.json({ ok: true, demo: true, message: 'Mensagem enviada (modo demo — Z-API não configurada).' });
  }

  const { phone, message } = req.body || {};
  if (!phone || !message) return res.status(400).json({ ok: false, message: 'phone e message são obrigatórios.' });

  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('55') ? digits : `55${digits}`;

  try {
    const r = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: number, message }),
        signal: AbortSignal.timeout(10000),
      }
    );
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ ok: false, message: data?.message || 'Erro ao enviar.' });
    return res.json({ ok: true, data });
  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
