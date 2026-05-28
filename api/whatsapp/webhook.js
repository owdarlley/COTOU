// Vercel serverless — recebe webhook da Z-API quando cliente clica em botão de aprovação
// Configurar em: Z-API Dashboard → Webhook → URL = https://cotou.vercel.app/api/whatsapp/webhook
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const body = req.body || {};

    // Z-API envia buttonsResponseMessage quando cliente clica em botão
    const selectedId = body?.buttonsResponseMessage?.selectedButtonId || '';
    if (!selectedId) return res.status(200).json({ ok: true, ignored: true });

    // ID do botão: "a_{token}" = aprovar, "r_{token}" = recusar
    const match = selectedId.match(/^([ar])_(.+)$/);
    if (!match) return res.status(200).json({ ok: true, ignored: true });

    const action = match[1] === 'a' ? 'approve' : 'reject';
    const token = match[2];

    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      console.warn('[webhook] BACKEND_URL não configurado');
      return res.status(200).json({ ok: true, warned: 'BACKEND_URL not set' });
    }

    const r = await fetch(`${backendUrl}/api/aprovar/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
      signal: AbortSignal.timeout(10000),
    });

    const data = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: data.ok ?? false, forwarded: true });
  } catch (err) {
    console.error('[webhook] Erro:', err.message);
    // Sempre retorna 200 para a Z-API não retentar
    return res.status(200).json({ ok: false, error: err.message });
  }
};
