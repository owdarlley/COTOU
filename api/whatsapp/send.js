// Vercel serverless — envia mensagem WhatsApp via Z-API
// Tenta send-button-list quando approvalToken é fornecido; cai para send-text
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const instanceId = req.body?.zapiInstanceId || process.env.ZAPI_INSTANCE_ID;
  const token = req.body?.zapiToken || process.env.ZAPI_TOKEN;
  const clientToken = req.body?.zapiClientToken || process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token) {
    return res.json({ ok: true, demo: true, message: 'Mensagem enviada (modo demo — Z-API não configurada).' });
  }

  const { phone, message, approvalToken } = req.body || {};
  if (!phone || !message) return res.status(400).json({ ok: false, message: 'phone e message são obrigatórios.' });

  const digits = phone.replace(/\D/g, '');
  const number = digits.startsWith('55') ? digits : `55${digits}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(clientToken ? { 'Client-Token': clientToken } : {}),
  };

  // Tenta botões de aprovação quando approvalToken é fornecido
  if (approvalToken) {
    try {
      const r = await fetch(
        `https://api.z-api.io/instances/${instanceId}/token/${token}/send-button-list`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            phone: number,
            message,
            buttonList: {
              buttons: [
                { id: `a_${approvalToken}`, label: '✅ Confirmar encomenda' },
                { id: `r_${approvalToken}`, label: '❌ Recusar cotação' },
              ],
            },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      const data = await r.json().catch(() => ({}));
      if (r.ok) return res.json({ ok: true, buttons: true, data });
    } catch (_) {
      // Cai para send-text abaixo
    }
  }

  // Fallback: texto simples
  try {
    const r = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers,
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
