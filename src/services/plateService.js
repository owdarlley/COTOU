const axios = require('axios');

async function lookupPlate(plate) {
  const token = process.env.PLATE_API_TOKEN;
  const baseUrl = process.env.PLATE_API_BASE_URL || 'https://wdapi2.com.br';
  const clean = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

  if (!token) return null;

  try {
    const { data } = await axios.get(`${baseUrl}/consulta/${clean}/${token}`, { timeout: 8000 });
    return normalize(data);
  } catch (err) {
    console.warn('[PlateService] Erro na consulta:', err.message);
    return null;
  }
}

function normalize(data) {
  if (!data) return null;
  return {
    make:       data.MARCA || data.marca || '',
    model:      data.MODELO || data.modelo || '',
    year_model: parseInt(data.anoModelo || data.ano || 0) || null,
    year_manuf: parseInt(data.anoFabricacao || data.ano_fabricacao || 0) || null,
    color:      data.cor || data.COR || '',
    fuel:       data.combustivel || data.COMBUSTIVEL || '',
    chassis:    data.chassi || data.CHASSI || '',
    raw:        JSON.stringify(data)
  };
}

module.exports = { lookupPlate };
