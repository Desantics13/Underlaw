const db = require('../config/db');

class NotificacionRepository {
  async findAll() {
    const [rows] = await db.execute('SELECT * FROM notificaciones ORDER BY fecha_creacion DESC LIMIT 50');
    return rows;
  }

  async create(mensaje) {
    const [result] = await db.execute(
      'INSERT INTO notificaciones (mensaje, leida) VALUES (?, 0)',
      [mensaje]
    );
    return { id: result.insertId, mensaje, leida: 0 };
  }

  async marcarTodasLeidas() {
    await db.execute('UPDATE notificaciones SET leida = 1 WHERE leida = 0');
  }

  async borrarTodas() {
    await db.execute('DELETE FROM notificaciones');
  }
}

module.exports = new NotificacionRepository();
