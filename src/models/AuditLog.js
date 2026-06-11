const { db } = require('../config/database');

class AuditLog {
  static insert({ userId, quotationId, action, oldValue, newValue, ip }) {
    try {
      db.prepare(
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
      console.error('[AuditLog] Falha ao registrar entrada:', err.message);
    }
  }
}

module.exports = AuditLog;
