// Endpoint de diagnóstico e limpeza temporário — REMOVER após resolver o problema
// ?cleanup=true  → deleta TODAS as instâncias e cria uma nova limpa
// ?instance=X    → mostra status da instância X
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!apiUrl || !apiKey) return res.json({ erro: 'Env vars ausentes' });

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

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // MODO LIMPEZA: ?cleanup=true
  if (req.query.cleanup === 'true') {
    // Lista todas as instâncias
    const listRes = await ft(`${apiUrl}/instance/fetchInstances`, { headers: h });
    const instances = Array.isArray(listRes.body) ? listRes.body : [];
    const deleted = [];

    // Deleta todas
    for (const inst of instances) {
      const name = inst.name || inst.instanceName || inst.instance?.instanceName;
      if (name) {
        const d = await ft(`${apiUrl}/instance/delete/${name}`, { method: 'DELETE', headers: h }, 4000);
        deleted.push({ name, result: d });
        await sleep(500);
      }
    }

    // Aguarda 2s e cria uma instância limpa
    await sleep(2000);
    const newName = req.query.instance || 'cotou-user-test';
    const createRes = await ft(`${apiUrl}/instance/create`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ instanceName: newName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    });

    // Aguarda 20s para o Baileys conectar no WhatsApp
    await sleep(20000);
    const qrRes = await ft(`${apiUrl}/instance/connect/${newName}`, { headers: h }, 8000);

    return res.json({ deleted, newInstance: createRes, qrResult: qrRes });
  }

  // MODO DIAGNÓSTICO (padrão)
  const instance = req.query.instance || 'cotou-user-3';
  const results = {};
  results.allInstances = await ft(`${apiUrl}/instance/fetchInstances`, { headers: h });
  results.connectQR = await ft(`${apiUrl}/instance/connect/${instance}`, { headers: h });

  return res.json({ apiUrl, instance, results });
};
