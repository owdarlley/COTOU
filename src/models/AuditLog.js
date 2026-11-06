const { db } = require('../config/database');
const logger = require('../config/logger');

class AuditLog {
  static async insert({ userId, quotationId, action, oldValue, newValue, ip }) {
    try {
      await db.prepare(
        'INSERT INTO audit_log (user_id, quotation_id, action, old_value_json, new_value_json, ip_address) VALUES (?,?,?,?,?,?)'
      ).run(
        userId || null,
        quotationId || null,
        action,
        oldValue != null ? JSON.stringify(oldValue) : null,
        newValue != null ? JSON.stringify(newValue) : null,
        ip || null
      );
    } catch (err) {
      logger.error({ err }, '[AuditLog] falha ao registrar entrada');
    }
  }

  static async findByQuotationId(quotationId) {
    return await db.prepare(`
      SELECT a.*, u.name AS user_name
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.quotation_id = ?
      ORDER BY a.created_at ASC
    `).all(quotationId);
  }

  static async findAll({ limit = 50, offset = 0 } = {}) {
    const rows = await db.prepare(`
      SELECT a.*, u.name AS user_name, q.quote_number
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN quotations q ON q.id = a.quotation_id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    const total = (await db.prepare('SELECT COUNT(*) as count FROM audit_log').get()).count;
    return { rows, total };
  }
}

module.exports = AuditLog;
