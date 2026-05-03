const axios = require('axios');

async function lookupPlate(plate) {
  const token = process.env.PLATE_API_TOKEN;
  const baseUrl = process.env.PLATE_API_BASE_URL || 'https://wdapi2.com.br';
  const clean = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (!token) return null;

  try {
    const { data } = await axios.get(`${baseUrl}/consulta/${clean}/${token}`, {
      timeout: 10000,
      headers: { 'Accept': 'application/json', 'User-Agent': 'COTOU/1.0' }
    });

    // Resposta inválida
    if (!data || typeof data !== 'object') return null;

    // A API retorna { mensagemRetorno: "Sem erros." quando OK
    // e pode retornar { mensagem: "..." } sem outros campos quando falha
    const hasVehicleData = data.MARCA || data.marca || data.MODELO || data.modelo;
    if (!hasVehicleData) {
      console.warn('[PlateService] Sem dados do veículo:', JSON.stringify(data).substring(0, 200));
      return null;
    }

    return normalize(data);
  } catch (err) {
    console.warn('[PlateService] Erro na consulta:', err.message);
    if (err.response) {
      console.warn('[PlateService] Status HTTP:', err.response.status);
    }
    return null;
  }
}

function normalize(data) {
  if (!data) return null;

  // Campos raiz
  const make  = data.MARCA  || data.marca  || '';
  const model = data.MODELO || data.modelo || '';
  const sub   = data.SUBMODELO || data.submodelo || '';
  const fullModel = (sub && sub !== model) ? `${model} ${sub}`.trim() : model;

  // Ano: raiz
  const anoModelo = data.anoModelo || data.ano || '';

  // Campos dentro de "extra" (plano completo da wdapi2)
  const extra = data.extra || {};
  const anoFab    = extra.ano_fabricacao || anoModelo;
  const combustivel = extra.combustivel || data.combustivel || '';

  return {
    make:       make,
    model:      fullModel,
    year_model: parseInt(anoModelo) || null,
    year_manuf: parseInt(anoFab)    || null,
    color:      data.cor      || '',
    fuel:       combustivel,
    chassis:    data.chassi   || '',
    city:       data.municipio || extra.municipio || '',
    uf:         data.uf        || extra.uf        || '',
    situation:  data.situacao  || '',
    raw:        JSON.stringify(data)
  };
}

module.exports = { lookupPlate };
