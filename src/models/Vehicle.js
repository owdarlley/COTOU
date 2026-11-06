const { db } = require('../config/database');

class Vehicle {
  static async findById(id) {
    return await db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
  }

  static async findByPlate(plate) {
    return await db.prepare('SELECT * FROM vehicles WHERE license_plate = ?').get(plate.toUpperCase().replace(/[^A-Z0-9]/g, ''));
  }

  static async upsert({ license_plate, make, model, year_model, year_manuf, color, fuel, chassis, plate_data_json }) {
    const plate = license_plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const existing = await this.findByPlate(plate);
    if (existing) {
      await db.prepare(`UPDATE vehicles SET make=?, model=?, year_model=?, year_manuf=?, color=?, fuel=?, chassis=?, plate_data_json=?, updated_at=datetime('now') WHERE id=?`)
        .run(make, model, year_model, year_manuf, color, fuel, chassis, plate_data_json, existing.id);
      return existing.id;
    }
    const result = await db.prepare(
      'INSERT INTO vehicles (license_plate, make, model, year_model, year_manuf, color, fuel, chassis, plate_data_json) VALUES (?,?,?,?,?,?,?,?,?)'
    ).run(plate, make, model, year_model, year_manuf, color, fuel, chassis, plate_data_json);
    return Number(result.lastInsertRowid);
  }
}

module.exports = Vehicle;
