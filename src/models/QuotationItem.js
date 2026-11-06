const { db } = require('../config/database');

class QuotationItem {
  static async findByQuotationId(quotationId) {
    return await db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id').all(quotationId);
  }

  static async findById(id) {
    return await db.prepare('SELECT * FROM quotation_items WHERE id = ?').get(id);
  }

  static async create({ quotationId, partName, partCode, partCatalogId, quantity, laborCostVendas }) {
    const result = await db.prepare(
      'INSERT INTO quotation_items (quotation_id, part_name, part_code, part_catalog_id, quantity, labor_cost_vendas) VALUES (?,?,?,?,?,?)'
    ).run(quotationId, partName, partCode || null, partCatalogId || null, quantity || 1, laborCostVendas || 0);
    return Number(result.lastInsertRowid);
  }

  static async updatePrices(id, { unitPrice, totalPrice, laborCostCompras, deliveryDays, deliveryDeadline, supplierName, notes }) {
    await db.prepare(`UPDATE quotation_items SET
      unit_price=?, total_price=?, labor_cost_compras=?,
      delivery_days=?, delivery_deadline=?, supplier_name=?, notes=?,
      item_status='cotado', updated_at=datetime('now')
      WHERE id=?
    `).run(unitPrice, totalPrice, laborCostCompras || 0, deliveryDays || null, deliveryDeadline || null, supplierName || null, notes || null, id);
  }

  static async updateLaborVendas(id, laborCostVendas) {
    await db.prepare("UPDATE quotation_items SET labor_cost_vendas=?, updated_at=datetime('now') WHERE id=?").run(laborCostVendas, id);
  }

  static async markArrived(id) {
    await db.prepare("UPDATE quotation_items SET item_status='peca_chegou', arrived_at=datetime('now'), updated_at=datetime('now') WHERE id=?").run(id);
  }

  static async delete(id) {
    await db.prepare('DELETE FROM quotation_items WHERE id = ?').run(id);
  }
}

module.exports = QuotationItem;
