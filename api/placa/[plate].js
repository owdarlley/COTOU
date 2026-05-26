// Vercel serverless function — proxy seguro para a API de placas
// O token fica server-side; o GitHub Pages chama este endpoint com CORS liberado.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://owdarlley.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { plate } = req.query;
  const token = process.env.PLATE_API_TOKEN;

  if (!token) {
    return res.status(503).json({ ok: false, code: 'NO_TOKEN', message: 'PLATE_API_TOKEN não configurado nas variáveis de ambiente da Vercel.' });
  }

  const clean = (plate || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (!/^[A-Z]{3}[0-9]{4}$/.test(clean) && !/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(clean)) {
    return res.status(400).json({ ok: false, code: 'INVALID_FORMAT', message: 'Formato de placa inválido. Use AAA9999 ou AAA0X00.' });
  }

  try {
    const apiRes = await fetch(`https://wdapi2.com.br/consulta/${clean}/${token}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'COTOU/1.0' },
    });

    const data = await apiRes.json();

    if (!apiRes.ok) {
      const codes = { 401: 'INVALID_PLATE', 402: 'INVALID_TOKEN', 406: 'NO_RESULTS', 429: 'RATE_LIMIT' };
      return res.status(apiRes.status).json({
        ok: false,
        code: codes[apiRes.status] || 'ERROR',
        message: data.message || 'Erro na consulta à API de placas.',
      });
    }

    const hasVehicleData = data.MARCA || data.marca || data.MODELO || data.modelo;
    if (!hasVehicleData) {
      return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Placa não encontrada ou sem dados disponíveis.' });
    }

    const extra = data.extra || {};
    const model = data.MODELO || data.modelo || '';
    const sub   = data.SUBMODELO || data.submodelo || '';
    const anoModelo = data.anoModelo || data.ano || '';

    const fipeList = Array.isArray(data.fipe) ? data.fipe : [];
    const bestFipe = fipeList.length
      ? fipeList.reduce((b, i) => (i.score > b.score ? i : b), fipeList[0])
      : null;

    return res.json({
      ok: true,
      data: {
        make:       data.MARCA || data.marca || '',
        model:      (sub && sub !== model) ? `${model} ${sub}`.trim() : model,
        year_model: parseInt(anoModelo) || null,
        year_manuf: parseInt(extra.ano_fabricacao || anoModelo) || null,
        color:      data.cor || '',
        fuel:       extra.combustivel || data.combustivel || '',
        chassis:    data.chassi || '',
        city:       data.municipio || extra.municipio || '',
        uf:         data.uf || extra.uf || '',
        situation:  data.situacao || '',
        fipe: bestFipe ? {
          codigo: bestFipe.codigo_fipe,
          valor:  bestFipe.valor_medio_fipe,
          score:  bestFipe.score,
        } : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ ok: false, code: 'ERROR', message: err.message });
  }
}
