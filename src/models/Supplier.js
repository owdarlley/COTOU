const { db } = require('../config/database');

class Supplier {
  static async findAll()       { return await db.prepare('SELECT * FROM suppliers WHERE active=1 ORDER BY name').all(); }
  static async findById(id)    { return await db.prepare('SELECT * FROM suppliers WHERE id=?').get(id); }
  static async create(data)    { return await db.prepare('INSERT INTO suppliers (name,phone,notes) VALUES (?,?,?)').run(data.name, data.phone||null, data.notes||null); }
  static async update(id,data) { return await db.prepare("UPDATE suppliers SET name=?,phone=?,notes=?,updated_at=datetime('now') WHERE id=?").run(data.name,data.phone||null,data.notes||null,id); }
  static async remove(id)      { return await db.prepare('UPDATE suppliers SET active=0 WHERE id=?').run(id); }
}

module.exports = Supplier;
