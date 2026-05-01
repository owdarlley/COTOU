const { db } = require('../config/database');

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

  static create({ quoteNumber, customerId, vehicleId, createdByUserId, notesVendas }) {
    const result = db.prepare(
      'INSERT INTO quotations (quote_number, customer_id, vehicle_id, created_by_user_id, notes_vendas) VALUES (?,?,?,?,?)'
    ).run(quoteNumber, customerId, vehicleId, createdByUserId, notesVendas || null);
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

  static countByStatus(userId, role) {
    const where = role === 'vendas' ? 'WHERE created_by_user_id = ?' : 'WHERE 1=1';
    const param = role === 'vendas' ? [userId] : [];
    return db.prepare(`SELECT status, COUNT(*) as count FROM quotations ${where} GROUP BY status`).all(...param);
  }
}

module.exports = Quotation;
