// Vercel serverless — retorna status de conexão da instância (Evolution API v2)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.json({ connected: false, demo: true });
  }

  const { instance } = req.query;
  if (!instance) return res.status(400).json({ connected: false, message: 'instance obrigatório.' });

  try {
    // v2: usa fetchInstances com filtro por nome
    const r = await fetch(`${apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instance)}`, {
      headers: { apikey: apiKey },
    });
    const data = await r.json();

    // Resposta é um array de instâncias
    const instances = Array.isArray(data) ? data : [];
    const found = instances.find(i =>
      i.instance?.instanceName === instance || i.instanceName === instance
    );

    const status = found?.instance?.connectionStatus || found?.connectionStatus || 'close';
    const connected = status === 'open';

    return res.json({ connected, state: status });
  } catch (err) {
    return res.json({ connected: false, message: err.message });
  }
};
