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

    console.log('[PlateService] Resposta bruta:', JSON.stringify(data).substring(0, 300));

    // API retornou erro ou texto
    if (!data || typeof data !== 'object') {
      console.warn('[PlateService] Resposta inválida:', data);
      return null;
    }

    // wdapi2 às vezes retorna { mensagem: "..." } em caso de erro
    if (data.mensagem || data.message || data.erro || data.error) {
      console.warn('[PlateService] Erro da API:', data.mensagem || data.message || data.erro || data.error);
      return null;
    }

    return normalize(data);
  } catch (err) {
    console.warn('[PlateService] Erro na consulta:', err.message);
    if (err.response) {
      console.warn('[PlateService] Status HTTP:', err.response.status, '| Body:', JSON.stringify(err.response.data).substring(0, 200));
    }
    return null;
  }
}

function normalize(data) {
  if (!data) return null;

  // wdapi2.com.br retorna campos em maiúsculo ou minúsculo dependendo do plano
  const make  = data.MARCA        || data.marca        || data.Marca        || '';
  const model = data.MODELO       || data.modelo       || data.Modelo       || '';
  const sub   = data.SUBMODELO    || data.submodelo    || '';
  const fullModel = sub ? `${model} ${sub}`.trim() : model;

  const anoModelo = data.anoModelo    || data.ANO_MODELO   || data.ano_modelo   || data.ano || '';
  const anoFab    = data.anoFabricacao|| data.ANO_FAB      || data.ano_fabricacao|| '';

  return {
    make:       make,
    model:      fullModel,
    year_model: parseInt(anoModelo) || null,
    year_manuf: parseInt(anoFab)    || null,
    color:      data.cor       || data.COR       || data.Cor       || '',
    fuel:       data.combustivel|| data.COMBUSTIVEL|| data.Combustivel|| '',
    chassis:    data.chassi    || data.CHASSI    || data.Chassi    || '',
    raw:        JSON.stringify(data)
  };
}

module.exports = { lookupPlate };
