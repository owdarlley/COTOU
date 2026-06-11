const { db } = require('../config/database');
const crypto = require('crypto');
const { normalizePhone } = require('../utils/phone');

const SELECT_FULL = `
  SELECT
    q.*,
    c.name  AS customer_name,
    c.phone AS customer_phone,
    v.license_plate, v.make, v.model, v.year_model, v.color,
    u1.name AS creator_name, u1.role AS creator_role,
    u2.name AS buyer_name
  FROM quotations q
  JOIN customers c  ON c.id = q.customer_id
  JOIN vehicles  v  ON v.id = q.vehicle_id
  JOIN users     u1 ON u1.id = q.created_by_user_id
  LEFT JOIN users u2 ON u2.id = q.assigned_buyer_id
`;

class Quotation {
  static findById(id) {
    return db.prepare(`${SELECT_FULL} WHERE q.id = ?`).get(id);
  }

  static findAll({ status, userId, role, page = 1, limit = 20 } = {}) {
    let where = 'WHERE 1=1';
    const params = [];
    if (status && status !== 'todos') { where += ' AND q.status = ?'; params.push(status); }
    if (role === 'vendas' && userId) { where += ' AND q.created_by_user_id = ?'; params.push(userId); }
    const offset = (page - 1) * limit;
    const items = db.prepare(`${SELECT_FULL} ${where} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM quotations q ${where}`).get(...params).count;
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  static create({ quoteNumber, customerId, vehicleId, createdByUserId, notesVendas, photoPath }) {
    const result = db.prepare(
      'INSERT INTO quotations (quote_number, customer_id, vehicle_id, created_by_user_id, notes_vendas, photo_path) VALUES (?,?,?,?,?,?)'
    ).run(quoteNumber, customerId, vehicleId, createdByUserId, notesVendas || null, photoPath || null);
    return Number(result.lastInsertRowid);
  }

  static updateStatus(id, newStatus, byUserId) {
    db.prepare(`UPDATE quotations SET status=?, assigned_buyer_id=COALESCE(assigned_buyer_id,?), updated_at=datetime('now') WHERE id=?`)
      .run(newStatus, byUserId, id);
  }

  static respond(id, { buyerId, notesCompras }) {
    db.prepare(`UPDATE quotations SET status='cotado', assigned_buyer_id=?, notes_compras=?, updated_at=datetime('now') WHERE id=?`)
      .run(buyerId, notesCompras || null, id);
  }

  static markPartArrived(id) {
    db.prepare(`UPDATE quotations SET status='peca_chegou', updated_at=datetime('now') WHERE id=?`).run(id);
  }

  static markWhatsappSent(id, byUserId) {
    db.prepare(`UPDATE quotations SET whatsapp_sent_at=datetime('now'), whatsapp_sent_by=?, updated_at=datetime('now') WHERE id=?`)
      .run(byUserId, id);
  }

  static updateNotes(id, { notesVendas, notesCompras }) {
    db.prepare(`UPDATE quotations SET notes_vendas=COALESCE(?,notes_vendas), notes_compras=COALESCE(?,notes_compras), updated_at=datetime('now') WHERE id=?`)
      .run(notesVendas !== undefined ? notesVendas : null, notesCompras !== undefined ? notesCompras : null, id);
  }

  static setCustomerApproval(id, approved, source = null) {
    db.prepare(`
      UPDATE quotations
      SET customer_approved = ?,
          customer_approved_at = datetime('now'),
          customer_approval_source = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(approved ? 1 : 0, source, id);
  }

  static generateApprovalToken(id) {
    // Preserva token existente ainda válido — evita invalidar link aberto no celular do cliente
    const existing = db.prepare(
      `SELECT approval_token FROM quotations WHERE id = ? AND approval_token IS NOT NULL AND approval_token_expires_at > datetime('now') AND customer_approved IS NULL`
    ).get(id);
    if (existing) return existing.approval_token;

    const token = crypto.randomBytes(24).toString('base64url');
    const expires = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    db.prepare(`UPDATE quotations SET approval_token=?, approval_token_expires_at=?, updated_at=datetime('now') WHERE id=?`)
      .run(token, expires, id);
    return token;
  }

  static getByApprovalToken(token) {
    return db.prepare(`
      ${SELECT_FULL}
      WHERE q.approval_token = ?
        AND q.approval_token_expires_at > datetime('now')
        AND q.customer_approved IS NULL
    `).get(token);
  }

  static useApprovalToken(token, approved, ip) {
    const q = this.getByApprovalToken(token);
    if (!q) return null;
    db.prepare(`
      UPDATE quotations
      SET customer_approved=?, customer_approved_at=datetime('now'),
          customer_approval_source='link',
          approval_ip=?, approval_token=NULL, updated_at=datetime('now')
      WHERE id=?
    `).run(approved ? 1 : 0, ip || null, q.id);
    return q;
  }

  static findPendingByPhone(phone, instanceName) {
    const last11 = normalizePhone(phone).slice(-11);
    // Quando instanceName é fornecido, só retorna cotações enviadas por usuários dessa instância
    // (ou cotações sem whatsapp_sent_by, como dados de seed)
    const instanceClause = instanceName
      ? `AND (q.whatsapp_sent_by IS NULL OR EXISTS (
            SELECT 1 FROM users WHERE id = q.whatsapp_sent_by AND whatsapp_instance_name = ?
          ))`
      : '';
    const params = instanceName ? [`%${last11}`, instanceName] : [`%${last11}`];
    return db.prepare(`
      ${SELECT_FULL}
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(c.phone,' ',''),'-',''),'(',''),')','') LIKE ?
        AND q.status IN ('cotado','peca_chegou')
        AND q.customer_approved IS NULL
        AND q.whatsapp_sent_at IS NOT NULL
        ${instanceClause}
      ORDER BY q.updated_at DESC
      LIMIT 1
    `).get(...params);
  }

  static countByStatus(userId, role) {
    const where = role === 'vendas' ? 'WHERE created_by_user_id = ?' : 'WHERE 1=1';
    const param = role === 'vendas' ? [userId] : [];
    return db.prepare(`SELECT status, COUNT(*) as count FROM quotations ${where} GROUP BY status`).all(...param);
  }
}

module.exports = Quotation;
