const axios = require('axios');

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

function buildMessage(quotation, items) {
  const laborTotal = items.reduce((s, i) => s + (i.labor_cost_compras || i.labor_cost_vendas || 0), 0);
  const partsTotal = items.reduce((s, i) => s + (i.total_price || 0), 0);
  const grandTotal = partsTotal + laborTotal;

  const itensTexto = items.map(i => {
    let linha = `• ${i.part_name}`;
    if (i.part_code) linha += ` (Cód: ${i.part_code})`;
    if (i.total_price) linha += ` — R$ ${i.total_price.toFixed(2)}`;
    if (i.delivery_days) linha += ` | Prazo: ${i.delivery_days} dias`;
    return linha;
  }).join('\n');

  const prazoTexto = items.find(i => i.delivery_days)
    ? `⏱ Prazo estimado de entrega: ${Math.max(...items.filter(i => i.delivery_days).map(i => i.delivery_days))} dias úteis`
    : '';

  return `Olá, *${quotation.customer_name}*! 👋

Sua cotação *#${quotation.quote_number}* está pronta!

🚗 *Veículo:* ${quotation.make || ''} ${quotation.model || ''} ${quotation.year_model || ''} — Placa ${quotation.license_plate}

📦 *Peças cotadas:*
${itensTexto}

${laborTotal > 0 ? `🔧 Mão de obra: R$ ${laborTotal.toFixed(2)}\n` : ''}💰 *Total estimado: R$ ${grandTotal.toFixed(2)}*
${prazoTexto}

Qualquer dúvida, estamos à disposição! 😊`;
}

async function sendQuoteMessage(customerPhone, quotation, items) {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;
  const instance = process.env.WHATSAPP_INSTANCE_NAME;

  if (!apiUrl || !apiKey || !instance) {
    throw new Error('WhatsApp API não configurada. Verifique as variáveis de ambiente.');
  }

  const number = formatPhone(customerPhone);
  const text = buildMessage(quotation, items);

  const { data } = await axios.post(
    `${apiUrl}/message/sendText/${instance}`,
    { number, text },
    { headers: { apikey: apiKey }, timeout: 15000 }
  );

  return { ok: true, data };
}

module.exports = { sendQuoteMessage, buildMessage };
