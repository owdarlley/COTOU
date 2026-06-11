function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function formatPhoneForWhatsApp(phone) {
  const digits = normalizePhone(phone);
  return digits.startsWith('55') ? digits : `55${digits}`;
}

module.exports = { normalizePhone, formatPhoneForWhatsApp };
