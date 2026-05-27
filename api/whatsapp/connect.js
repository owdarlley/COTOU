// Vercel serverless — cria instância e retorna QR ou pending (Evolution API v2)
// Projetado para caber no limite de 10s do Vercel free tier
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed' });

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) {
    return res.json({ ok: false, demo: true, message: 'Env vars ausentes.' });
  }

  const { instanceName } = req.body || {};
  if (!instanceName) return res.status(400).json({ ok: false, message: 'instanceName obrigatorio.' });

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const h = { 'Content-Type': 'application/json', apikey: apiKey };

  // Fetch com timeout individual — evita pendurar no Render dormindo
  async function ft(url, opts = {}, ms = 4000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
    catch (e) { return null; }
    finally { clearTimeout(t); }
  }

  try {
    // 1. Verifica se já está conectada (4s timeout — se Render dormindo, retorna null)
    const checkRes = await ft(
      `${apiUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
      { headers: h }
    );

    if (checkRes && checkRes.ok) {
      const list = await checkRes.json().catch(() => []);
      const found = Array.isArray(list) ? list.find(
        i => (i.name || i.instanceName || i.instance?.instanceName) === instanceName
      ) : null;
      const status = found?.connectionStatus || found?.instance?.connectionStatus;

      if (status === 'open') return res.json({ ok: true, alreadyConnected: true });

      // Existe mas não conectada — deleta para recriar
      if (found) {
        await ft(`${apiUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: h }, 3000);
        await sleep(800);
      }
    }
    // Se checkRes === null, Render está acordando — continua tentando criar

    // 2. Cria instância (4s timeout)
    const createRes = await ft(`${apiUrl}/instance/create`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });

    if (!createRes) {
      // Render ainda acordando — retorna pending, frontend faz polling via /api/whatsapp/qr
      return res.json({ ok: true, pending: true, instanceName });
    }

    const createData = await createRes.json().catch(() => ({}));

    // QR já veio na resposta de criação
    const qrOnCreate = createData?.qrcode?.base64;
    if (qrOnCreate && qrOnCreate.startsWith('data:')) {
      return res.json({ ok: true, qrcode: qrOnCreate });
    }

    // 3. Tenta buscar QR uma vez (2s de espera)
    await sleep(2000);
    const qrRes = await ft(`${apiUrl}/instance/connect/${instanceName}`, { headers: h });
    if (qrRes && qrRes.ok) {
      const qrData = await qrRes.json().catch(() => ({}));
      if (qrData?.base64 && qrData.base64.startsWith('data:')) {
        return res.json({ ok: true, qrcode: qrData.base64 });
      }
    }

    // QR ainda não disponível — frontend faz polling via /api/whatsapp/qr
    return res.json({ ok: true, pending: true, instanceName });

  } catch (err) {
    return res.status(502).json({ ok: false, message: err.message });
  }
};
