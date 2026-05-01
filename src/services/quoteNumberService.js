const { db } = require('../config/database');

function generateQuoteNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM quotations WHERE strftime('%Y', created_at) = ?"
  ).get(String(year));
  const seq = (row.count || 0) + 1;
  return `COT-${year}-${String(seq).padStart(4, '0')}`;
}

module.exports = { generateQuoteNumber };
