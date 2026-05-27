// Endpoint de diagnóstico temporário — REMOVER após resolver o problema
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) return res.json({ erro: 'Env vars ausentes', apiUrl: !!apiUrl, apiKey: !!apiKey });

  const instance = req.query.instance || 'cotou-user-3';
  const h = { 'Content-Type': 'application/json', apikey: apiKey };

  async function ft(url, opts = {}, ms = 6000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { ...opts, signal: ctrl.signal });
      const body = await r.json().catch(() => null);
      return { status: r.status, ok: r.ok, body };
    } catch (e) {
      return { erro: e.message };
    } finally {
      clearTimeout(t);
    }
  }

  const results = {};

  // 1. Verifica se instância existe
  results.fetchInstances = await ft(
    `${apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`,
    { headers: h }
  );

  // 2. Tenta criar instância
  results.create = await ft(`${apiUrl}/instance/create`, {
    method: 'POST', headers: h,
    body: JSON.stringify({ instanceName: instance + '-dbg', qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
  });

  // 3. Busca QR da instância principal
  results.connectQR = await ft(
    `${apiUrl}/instance/connect/${instance}`,
    { headers: h }
  );

  // 4. Lista todas as instâncias
  results.allInstances = await ft(`${apiUrl}/instance/fetchInstances`, { headers: h });

  return res.json({
    apiUrl,
    instance,
    results,
  });
};
