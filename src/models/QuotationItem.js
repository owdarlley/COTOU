const { db } = require('../config/database');

class QuotationItem {
  static findByQuotationId(quotationId) {
    return db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ? ORDER BY id').all(quotationId);
  }

  static findById(id) {
    return db.prepare('SELECT * FROM quotation_items WHERE id = ?').get(id);
  }

  static create({ quotationId, partName, partCode, partCatalogId, quantity, laborCostVendas }) {
    const result = db.prepare(
      'INSERT INTO quotation_items (quotation_id, part_name, part_code, part_catalog_id, quantity, labor_cost_vendas) VALUES (?,?,?,?,?,?)'
    ).run(quotationId, partName, partCode || null, partCatalogId || null, quantity || 1, laborCostVendas || 0);
    return Number(result.lastInsertRowid);
  }

  static updatePrices(id, { unitPrice, totalPrice, laborCostCompras, deliveryDays, deliveryDeadline, supplierName, notes }) {
    db.prepare(`UPDATE quotation_items SET
      unit_price=?, total_price=?, labor_cost_compras=?,
      delivery_days=?, delivery_deadline=?, supplier_name=?, notes=?,
      item_status='cotado', updated_at=datetime('now')
      WHERE id=?
    `).run(unitPrice, totalPrice, laborCostCompras || 0, deliveryDays || null, deliveryDeadline || null, supplierName || null, notes || null, id);
  }

  static updateLaborVendas(id, laborCostVendas) {
    db.prepare("UPDATE quotation_items SET labor_cost_vendas=?, updated_at=datetime('now') WHERE id=?").run(laborCostVendas, id);
  }

  static markArrived(id) {
    db.prepare("UPDATE quotation_items SET item_status='peca_chegou', arrived_at=datetime('now'), updated_at=datetime('now') WHERE id=?").run(id);
  }

  static delete(id) {
    db.prepare('DELETE FROM quotation_items WHERE id = ?').run(id);
  }
}

module.exports = QuotationItem;
