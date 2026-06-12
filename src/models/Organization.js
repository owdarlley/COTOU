'use strict';

const { db } = require('../config/database');

class Organization {
  static findById(id) {
    return db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
  }

  static findBySlug(slug) {
    return db.prepare('SELECT * FROM organizations WHERE slug = ?').get(slug);
  }

  static findAll() {
    return db.prepare('SELECT * FROM organizations ORDER BY name ASC').all();
  }

  static create({ name, slug, plan = 'trial', maxUsers = 5 }) {
    const info = db.prepare(`
      INSERT INTO organizations (name, slug, plan, max_users)
      VALUES (?, ?, ?, ?)
    `).run(name, slug, plan, maxUsers);
    return this.findById(info.lastInsertRowid);
  }

  static update(id, { name, plan, maxUsers, active }) {
    const fields = [];
    const values = [];
    if (name !== undefined)     { fields.push('name = ?');      values.push(name); }
    if (plan !== undefined)     { fields.push('plan = ?');       values.push(plan); }
    if (maxUsers !== undefined) { fields.push('max_users = ?');  values.push(maxUsers); }
    if (active !== undefined)   { fields.push('active = ?');     values.push(active ? 1 : 0); }
    if (!fields.length) return this.findById(id);
    values.push(id);
    db.prepare(`UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  static countUsers(orgId) {
    return db.prepare('SELECT COUNT(*) as count FROM users WHERE organization_id = ?').get(orgId)?.count ?? 0;
  }

  static slugify(name) {
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

module.exports = Organization;
