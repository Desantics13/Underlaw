const db = require('../config/db');

class SitioVideoRepository {
  async findAll() {
    const [rows] = await db.execute('SELECT id, titulo, youtube_url, orden FROM sitio_videos ORDER BY orden ASC, id ASC');
    return rows;
  }

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM sitio_videos WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
  }

  // Nuevo video al final del orden actual, salvo que se indique lo contrario.
  async create({ titulo, youtube_url, orden }) {
    let ordenFinal = orden;
    if (ordenFinal === undefined || ordenFinal === null) {
      const [rows] = await db.execute('SELECT COALESCE(MAX(orden), -1) AS maxOrden FROM sitio_videos');
      ordenFinal = rows[0].maxOrden + 1;
    }
    const [result] = await db.execute(
      'INSERT INTO sitio_videos (titulo, youtube_url, orden) VALUES (?, ?, ?)',
      [titulo, youtube_url, ordenFinal]
    );
    return this.findById(result.insertId);
  }

  // Actualiza solo los campos que vengan definidos.
  async update(id, { titulo, youtube_url, orden }) {
    const sets = [];
    const valores = [];
    if (titulo !== undefined) { sets.push('titulo = ?'); valores.push(titulo); }
    if (youtube_url !== undefined) { sets.push('youtube_url = ?'); valores.push(youtube_url); }
    if (orden !== undefined) { sets.push('orden = ?'); valores.push(orden); }
    if (sets.length > 0) {
      await db.execute(`UPDATE sitio_videos SET ${sets.join(', ')} WHERE id = ?`, [...valores, id]);
    }
    return this.findById(id);
  }

  async delete(id) {
    await db.execute('DELETE FROM sitio_videos WHERE id = ?', [id]);
  }
}

module.exports = new SitioVideoRepository();
