const db = require('../config/db');

class PedidoItemRepository {
  // items: [{ producto_id, nombre_producto, talla, cantidad }, ...]
  async insertMany(pedidoId, items) {
    if (!items || items.length === 0) return;
    const placeholders = items.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params = items.flatMap((it) => [pedidoId, it.producto_id || null, it.nombre_producto, it.talla || null, it.cantidad]);
    await db.execute(
      `INSERT INTO pedido_items (pedido_id, producto_id, nombre_producto, talla, cantidad) VALUES ${placeholders}`,
      params
    );
  }

  async findByPedidoId(pedidoId, conn = db) {
    const [rows] = await conn.execute('SELECT * FROM pedido_items WHERE pedido_id = ?', [pedidoId]);
    return rows;
  }
}

module.exports = new PedidoItemRepository();
