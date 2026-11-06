const { db } = require('../config/database');

class PartsCatalog {
  static async findById(id) {
    return await db.prepare('SELECT * FROM parts_catalog WHERE id = ?').get(id);
  }

  static async findByCode(code) {
    return await db.prepare('SELECT * FROM parts_catalog WHERE code = ?').get(code);
  }

  static async search(q) {
    return await db.prepare(
      "SELECT * FROM parts_catalog WHERE code LIKE ? OR name LIKE ? ORDER BY name LIMIT 15"
    ).all(`%${q}%`, `%${q}%`);
  }

  static async findAll({ page = 1, limit = 20, q = '' } = {}) {
    const offset = (page - 1) * limit;
    const where = q ? "WHERE code LIKE ? OR name LIKE ?" : "";
    const params = q ? [`%${q}%`, `%${q}%`] : [];
    const items = await db.prepare(`SELECT * FROM parts_catalog ${where} ORDER BY name LIMIT ? OFFSET ?`).all(...params, limit, offset);
    const total = (await db.prepare(`SELECT COUNT(*) as count FROM parts_catalog ${where}`).get(...params)).count;
    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  static async create({ code, name, description, default_price }) {
    const result = await db.prepare(
      'INSERT INTO parts_catalog (code, name, description, default_price) VALUES (?, ?, ?, ?)'
    ).run(code, name, description || null, default_price || null);
    return Number(result.lastInsertRowid);
  }

  static async update(id, { code, name, description, default_price }) {
    await db.prepare(`UPDATE parts_catalog SET code=?, name=?, description=?, default_price=?, updated_at=datetime('now') WHERE id=?`)
      .run(code, name, description || null, default_price || null, id);
  }

  static async delete(id) {
    await db.prepare('DELETE FROM parts_catalog WHERE id = ?').run(id);
  }
}

module.exports = PartsCatalog;
