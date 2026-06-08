const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static findById(id) {
    return db.prepare('SELECT id, name, email, role, phone_whatsapp, whatsapp_instance_name, whatsapp_connected_at, active, created_at FROM users WHERE id = ?').get(id);
  }

  static findByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email);
  }

  static findAllByRole(role) {
    return db.prepare('SELECT id, name, email, role, phone_whatsapp, whatsapp_instance_name, whatsapp_connected_at, active FROM users WHERE role = ? AND active = 1').all(role);
  }

  static findAll() {
    return db.prepare('SELECT id, name, email, role, phone_whatsapp, whatsapp_instance_name, whatsapp_connected_at, active, created_at FROM users ORDER BY name').all();
  }

  static async create({ name, email, password, role, phone_whatsapp }) {
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, role, phone_whatsapp) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email, hash, role, phone_whatsapp || null);
    const id = Number(result.lastInsertRowid);
    return { id, name, email, role, phone_whatsapp: phone_whatsapp || null };
  }

  static update(id, { name, email, role, phone_whatsapp, active }) {
    const toNull = v => (v === undefined ? null : v);
    const toBool = v => (v === undefined ? null : (v ? 1 : 0));
    db.prepare(`UPDATE users SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      role = COALESCE(?, role),
      phone_whatsapp = COALESCE(?, phone_whatsapp),
      active = COALESCE(?, active),
      updated_at = datetime('now')
      WHERE id = ?
    `).run(toNull(name), toNull(email), toNull(role), toNull(phone_whatsapp), toBool(active), id);
  }

  // Registra instância + marca como conectado (só chamar quando realmente open)
  static setWhatsappInstance(id, instanceName) {
    db.prepare(`UPDATE users SET
      whatsapp_instance_name = ?,
      whatsapp_connected_at = datetime('now'),
      updated_at = datetime('now')
      WHERE id = ?
    `).run(instanceName, id);
  }

  // Só vincula o nome da instância — NÃO marca como conectado
  static setWhatsappInstanceName(id, instanceName) {
    db.prepare(`UPDATE users SET
      whatsapp_instance_name = ?,
      whatsapp_connected_at = NULL,
      updated_at = datetime('now')
      WHERE id = ?
    `).run(instanceName, id);
  }

  // Marca conexão confirmada sem alterar o nome da instância
  static markWhatsappConnected(id) {
    db.prepare(`UPDATE users SET
      whatsapp_connected_at = datetime('now'),
      updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
  }

  static clearWhatsappInstance(id) {
    db.prepare(`UPDATE users SET
      whatsapp_instance_name = NULL,
      whatsapp_connected_at = NULL,
      updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
  }

  // Limpa só o timestamp de conexão, mantém o nome da instância
  static clearWhatsappConnectedAt(id) {
    db.prepare(`UPDATE users SET
      whatsapp_connected_at = NULL,
      updated_at = datetime('now')
      WHERE id = ?
    `).run(id);
  }

  static async updatePassword(id, newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, id);
  }

  static deactivate(id) {
    db.prepare("UPDATE users SET active = 0, updated_at = datetime('now') WHERE id = ?").run(id);
  }

  static async verifyPassword(user, plainPassword) {
    return bcrypt.compare(plainPassword, user.password_hash);
  }
}

module.exports = User;
