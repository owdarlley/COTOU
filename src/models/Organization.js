'use strict';

const { db } = require('../config/database');

class Organization {
  static async findById(id) {
    return await db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
  }

  static async findBySlug(slug) {
    return await db.prepare('SELECT * FROM organizations WHERE slug = ?').get(slug);
  }

  static async findAll() {
    return await db.prepare('SELECT * FROM organizations ORDER BY name ASC').all();
  }

  static async create({ name, slug, plan = 'trial', maxUsers = 5 }) {
    const info = await db.prepare(`
      INSERT INTO organizations (name, slug, plan, max_users)
      VALUES (?, ?, ?, ?)
    `).run(name, slug, plan, maxUsers);
    return await this.findById(info.lastInsertRowid);
  }

  static async update(id, { name, plan, maxUsers, active }) {
    const fields = [];
    const values = [];
    if (name !== undefined)     { fields.push('name = ?');      values.push(name); }
    if (plan !== undefined)     { fields.push('plan = ?');       values.push(plan); }
    if (maxUsers !== undefined) { fields.push('max_users = ?');  values.push(maxUsers); }
    if (active !== undefined)   { fields.push('active = ?');     values.push(active ? 1 : 0); }
    if (!fields.length) return await this.findById(id);
    values.push(id);
    await db.prepare(`UPDATE organizations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return await this.findById(id);
  }

  static async countUsers(orgId) {
    return (await db.prepare('SELECT COUNT(*) as count FROM users WHERE organization_id = ?').get(orgId))?.count ?? 0;
  }

  static async slugify(name) {
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

module.exports = Organization;
