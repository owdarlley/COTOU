const { db } = require('../config/database');

class PartsCatalog {
  static findById(id) {
    return db.prepare('SELECT * FROM parts_catalog WHERE id = ?').get(id);
  }

  static findByCode(code) {
    return db.prepare('SELECT * FROM parts_catalog WHERE code = ?').get(code);
  }

  static search(q) {
    return db.prepare(
      "SELECT * FROM parts_catalog WHERE code LIKE ? OR name LIKE ? ORDER BY name LIMIT 15"
    ).all(`%${q}%`, `%${q}%`);
  }

  static findAll({ page = 1, limit = 20, q = '' } = {}) {
    const offset = (page - 1) * limit;
    const where = q ? "WHERE code LIKE ? OR name LIKE ?" : "";
    const params = q ? [`%${q}%`, `%${q}%`] : [];
    const items = db.prepare(`SELECT * FROM parts_catalog ${where} ORDER BY name LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const total = db.prepare(`SELECT COUNT(*) as count FROM parts_catalog ${where}`).get(...params).count;
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  static create({ code, name, description, default_price }) {
    const result = db.prepare(
      'INSERT INTO parts_catalog (code, name, description, default_price) VALUES (?, ?, ?, ?)'
    ).run(code, name, description || null, default_price || null);
    return Number(result.lastInsertRowid);
  }

  static update(id, { code, name, description, default_price }) {
    db.prepare(`UPDATE parts_catalog SET code=?, name=?, description=?, default_price=?, updated_at=datetime('now') WHERE id=?`)
      .run(code, name, description || null, default_price || null, id);
  }

  static delete(id) {
    db.prepare('DELETE FROM parts_catalog WHERE id = ?').run(id);
  }
}

module.exports = PartsCatalog;
