const { db } = require('../config/database');

class Supplier {
  static findAll()       { return db.prepare('SELECT * FROM suppliers WHERE active=1 ORDER BY name').all(); }
  static findById(id)    { return db.prepare('SELECT * FROM suppliers WHERE id=?').get(id); }
  static create(data)    { return db.prepare('INSERT INTO suppliers (name,phone,notes) VALUES (?,?,?)').run(data.name, data.phone||null, data.notes||null); }
  static update(id,data) { return db.prepare("UPDATE suppliers SET name=?,phone=?,notes=?,updated_at=datetime('now') WHERE id=?").run(data.name,data.phone||null,data.notes||null,id); }
  static remove(id)      { return db.prepare('UPDATE suppliers SET active=0 WHERE id=?').run(id); }
}

module.exports = Supplier;
