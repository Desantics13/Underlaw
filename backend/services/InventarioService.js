const db = require('../config/db');
const PedidoItemRepository = require('../repositories/PedidoItemRepository');
const NotificacionRepository = require('../repositories/NotificacionRepository');

// ─────────────────────────────────────────────────────────────────────────
// DESCUENTO DE INVENTARIO
//
// Punto único que baja el stock cuando un pedido queda APROBADO (lo llama
// WompiController._reconciliarPedido, sin importar si el aviso llegó por el
// callback del Widget, la consulta directa a Wompi o el webhook oficial).
//
// Todo corre en una transacción con SELECT ... FOR UPDATE sobre el pedido y
// cada producto involucrado:
//  - El flag "inventario_descontado" en el pedido evita descontar dos veces
//    si se reconcilia el mismo pedido más de una vez.
//  - Solo se tocan tallas con cantidad numérica (las "sin contar" quedan igual).
//  - Nunca baja de 0. Si dos compras simultáneas dejan la talla sin stock
//    suficiente, se deja en 0 y se avisa al Admin por notificación en vez de
//    fallar la compra (Wompi ya cobró; el stock negativo no es una opción).
// ─────────────────────────────────────────────────────────────────────────
class InventarioService {
  async descontarInventarioPedido(pedidoId) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [pedidoRows] = await conn.execute(
        'SELECT id, inventario_descontado FROM producto WHERE id = ? FOR UPDATE',
        [pedidoId]
      );
      const pedido = pedidoRows[0];
      if (!pedido || pedido.inventario_descontado) {
        await conn.commit();
        return;
      }

      const items = await PedidoItemRepository.findByPedidoId(pedidoId, conn);
      const insuficientes = [];

      for (const item of items) {
        if (!item.producto_id || !item.talla) continue;

        const [prodRows] = await conn.execute(
          'SELECT id, nombre_producto, tallas FROM catalogo_productos WHERE id = ? FOR UPDATE',
          [item.producto_id]
        );
        const producto = prodRows[0];
        if (!producto) continue;

        let tallas = producto.tallas;
        if (typeof tallas === 'string') {
          try { tallas = JSON.parse(tallas); } catch { tallas = []; }
        }
        if (!Array.isArray(tallas)) continue;

        let cambiado = false;
        const nuevasTallas = tallas.map((t) => {
          if (t.talla !== item.talla || t.cantidad === null || t.cantidad === undefined) return t;
          cambiado = true;
          const restante = t.cantidad - item.cantidad;
          if (restante < 0) insuficientes.push({ nombre: producto.nombre_producto, talla: item.talla });
          return { ...t, cantidad: Math.max(0, restante) };
        });

        if (cambiado) {
          await conn.execute('UPDATE catalogo_productos SET tallas = ? WHERE id = ?', [JSON.stringify(nuevasTallas), item.producto_id]);
        }
      }

      await conn.execute('UPDATE producto SET inventario_descontado = 1 WHERE id = ?', [pedidoId]);
      await conn.commit();

      for (const ins of insuficientes) {
        try {
          await NotificacionRepository.create(`Venta con stock insuficiente: ${ins.nombre} talla ${ins.talla}`);
        } catch (error) {
          console.error('No se pudo crear la notificación de stock insuficiente:', error);
        }
      }
    } catch (error) {
      await conn.rollback();
      console.error(`Error al descontar el inventario del pedido ${pedidoId}:`, error);
      throw error;
    } finally {
      conn.release();
    }
  }
}

module.exports = new InventarioService();
