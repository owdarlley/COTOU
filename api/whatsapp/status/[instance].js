// Vercel serverless — retorna status de conexão da instância
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
    const r = await fetch(`${apiUrl}/instance/connectionState/${instance}`, {
      headers: { apikey: apiKey },
    });
    const data = await r.json();
    const connected = data?.instance?.state === 'open';
    return res.json({ connected, state: data?.instance?.state });
  } catch (err) {
    return res.json({ connected: false, message: err.message });
  }
};
