const db = require('../config/db');

class SeccionRepository {
  async findAll() {
    const [rows] = await db.execute('SELECT * FROM secciones ORDER BY orden ASC, id ASC');
    return rows;
  }

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM secciones WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  // Nueva sección al final del orden actual, salvo que se indique lo contrario.
  async create({ nombre, orden }) {
    let ordenFinal = orden;
    if (ordenFinal === undefined || ordenFinal === null) {
      const [rows] = await db.execute('SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM secciones');
      ordenFinal = rows[0].maxOrden + 1;
    }
    const [result] = await db.execute(
      'INSERT INTO secciones (nombre, orden) VALUES (?, ?)',
      [nombre, ordenFinal]
    );
    return this.findById(result.insertId);
  }

  async update(id, { nombre, orden }) {
    if (orden !== undefined) {
      await db.execute('UPDATE secciones SET nombre = ?, orden = ? WHERE id = ?', [nombre, orden, id]);
    } else {
      await db.execute('UPDATE secciones SET nombre = ? WHERE id = ?', [nombre, id]);
    }
    return this.findById(id);
  }

  // Los productos que apunten a esta sección quedan con seccion_id = NULL
  // (ON DELETE SET NULL en la llave foránea), no se borran.
  async delete(id) {
    await db.execute('DELETE FROM secciones WHERE id = ?', [id]);
  }
}

module.exports = new SeccionRepository();
