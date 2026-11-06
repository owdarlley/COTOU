const { db } = require('../config/database');

async function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const row = await db.prepare(
    "SELECT COUNT(*) as count FROM quotations WHERE to_char(created_at, 'YYYY') = ?"
  ).get(String(year));
  const seq = (Number(row && row.count) || 0) + 1;
  return `COT-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = { generateQuoteNumber };
