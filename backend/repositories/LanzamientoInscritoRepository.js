const db = require('../config/db');

class LanzamientoInscritoRepository {
  // Propaga el error de MySQL si el correo ya está inscrito en este lanzamiento
  // (índice único uq_inscrito_correo_lanzamiento). El controller lo traduce a 409.
  async create(lanzamientoId, { nombre, apellido, correo, telefono }) {
    const [result] = await db.execute(
      'INSERT INTO lanzamiento_inscritos (lanzamiento_id, nombre, apellido, correo, telefono) VALUES (?, ?, ?, ?, ?)',
      [lanzamientoId, nombre, apellido, correo, telefono]
    );
    return { id: result.insertId, lanzamiento_id: lanzamientoId, nombre, apellido, correo, telefono };
  }

  // Inscritos de un lanzamiento que todavía no recibieron el correo de "ya disponible".
  async findPendientesNotificacion(lanzamientoId) {
    const [rows] = await db.execute(
      'SELECT * FROM lanzamiento_inscritos WHERE lanzamiento_id = ? AND notificado_at IS NULL',
      [lanzamientoId]
    );
    return rows;
  }

  async marcarNotificado(id) {
    await db.execute('UPDATE lanzamiento_inscritos SET notificado_at = UTC_TIMESTAMP() WHERE id = ?', [id]);
  }

  async contarPorLanzamiento(lanzamientoId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) AS total FROM lanzamiento_inscritos WHERE lanzamiento_id = ?',
      [lanzamientoId]
    );
    return rows[0]?.total || 0;
  }
}

module.exports = new LanzamientoInscritoRepository();
