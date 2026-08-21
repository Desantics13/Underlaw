const db = require('../config/db');

class DireccionRepository {
  // Guarda la dirección de envío asociada a un pedido (producto.id)
  async save(pedidoId, { pais, municipio, ciudad, direccion }) {
    const query = `
      INSERT INTO direccion (pedido_id, pais, municipio, ciudad, direccion)
      VALUES (?, ?, ?, ?, ?)
    `;

    try {
      const [result] = await db.execute(query, [pedidoId, pais, municipio, ciudad, direccion]);
      return { id: result.insertId, pedidoId, pais, municipio, ciudad, direccion };
    } catch (error) {
      console.error('Error al guardar la dirección de envío:', error);
      throw new Error('Error de base de datos al guardar la dirección de envío');
    }
  }

  async findByPedidoId(pedidoId) {
    try {
      const [rows] = await db.execute('SELECT * FROM direccion WHERE pedido_id = ? LIMIT 1', [pedidoId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error al buscar la dirección por pedido:', error);
      throw new Error('Error de base de datos al buscar la dirección');
    }
  }
}

module.exports = new DireccionRepository();
