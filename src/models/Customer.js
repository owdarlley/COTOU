const { db } = require('../config/database');

class Customer {
  static findById(id) {
    return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  }

  static findByPhone(phone) {
    return db.prepare('SELECT * FROM customers WHERE phone = ?').get(phone);
  }

  static findAll() {
    return db.prepare(`
      SELECT c.*,
        COUNT(q.id)       AS quotation_count,
        MAX(q.created_at) AS last_quotation_at
      FROM customers c
      LEFT JOIN quotations q ON q.customer_id = c.id
      GROUP BY c.id
      ORDER BY c.name
    `).all();
  }

  static update(id, data) {
    return db.prepare(`
      UPDATE customers SET name=?, phone=?, updated_at=datetime('now') WHERE id=?
    `).run(data.name, data.phone || null, id);
  }

  static findOrCreate({ name, phone }) {
    let customer = this.findByPhone(phone);
    if (!customer) {
      const result = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)').run(name, phone);
      customer = this.findById(Number(result.lastInsertRowid));
    } else if (customer.name !== name) {
      db.prepare("UPDATE customers SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, customer.id);
      customer.name = name;
    }
    return customer;
  }

  static search(q) {
    return db.prepare(
      "SELECT * FROM customers WHERE name LIKE ? OR phone LIKE ? ORDER BY name LIMIT 10"
    ).all(`%${q}%`, `%${q}%`);
  }
}

module.exports = Customer;
