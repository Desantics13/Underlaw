const db = require('../config/db');

class SitioImagenRepository {
  async findAll() {
    const [rows] = await db.execute(
      'SELECT id, zona, url, public_id, posicion, alt, orden FROM sitio_imagenes ORDER BY zona ASC, orden ASC, id ASC'
    );
    return rows;
  }

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM sitio_imagenes WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  async findByZona(zona) {
    const [rows] = await db.execute(
      'SELECT * FROM sitio_imagenes WHERE zona = ? ORDER BY orden ASC, id ASC',
      [zona]
    );
    return rows;
  }

  // Nueva imagen al final del orden de su zona, salvo que se indique "orden".
  async create({ zona, url, publicId, posicion, alt, orden }) {
    let ordenFinal = orden;
    if (ordenFinal === undefined || ordenFinal === null) {
      const [rows] = await db.execute(
        'SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM sitio_imagenes WHERE zona = ?',
        [zona]
      );
      ordenFinal = rows[0].maxOrden + 1;
    }
    const [result] = await db.execute(
      'INSERT INTO sitio_imagenes (zona, url, public_id, posicion, alt, orden) VALUES (?, ?, ?, ?, ?, ?)',
      [zona, url, publicId || null, posicion, alt || null, ordenFinal]
    );
    return this.findById(result.insertId);
  }

  // Actualiza solo los campos que vengan definidos.
  async update(id, campos) {
    const columnas = { url: 'url', publicId: 'public_id', posicion: 'posicion', alt: 'alt', orden: 'orden' };
    const sets = [];
    const valores = [];
    Object.keys(columnas).forEach((k) => {
      if (campos[k] !== undefined) {
        sets.push(`${columnas[k]} = ?`);
        valores.push(campos[k]);
      }
    });
    if (sets.length > 0) {
      await db.execute(`UPDATE sitio_imagenes SET ${sets.join(', ')} WHERE id = ?`, [...valores, id]);
    }
    return this.findById(id);
  }

  async delete(id) {
    await db.execute('DELETE FROM sitio_imagenes WHERE id = ?', [id]);
  }
}

module.exports = new SitioImagenRepository();
