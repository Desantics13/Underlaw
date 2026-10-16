const db = require('../config/db');

// Ajustes sueltos del sitio (tabla sitio_ajustes: clave -> valor).
class SitioAjusteRepository {
  async get(clave) {
    const [rows] = await db.execute('SELECT valor FROM sitio_ajustes WHERE clave = ? LIMIT 1', [clave]);
    return rows[0] ? rows[0].valor : null;
  }

  async set(clave, valor) {
    await db.execute(
      'INSERT INTO sitio_ajustes (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
      [clave, valor]
    );
  }
}

module.exports = new SitioAjusteRepository();
