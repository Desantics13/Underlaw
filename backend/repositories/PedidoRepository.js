const db = require('../config/db');
const Pedido = require('../models/Pedido');

class PedidoRepository {
  // Método para guardar un nuevo pedido en la base de datos
  async save(pedidoData) {
    const query = `
      INSERT INTO producto 
      (nombre_cliente, apellido_cliente, correo_cliente, telefono_cliente, nombre_producto, precio_producto, metodo_pago) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      pedidoData.nombre_cliente,
      pedidoData.apellido_cliente,
      pedidoData.correo_cliente,
      pedidoData.telefono_cliente,
      pedidoData.nombre_producto,
      pedidoData.precio_producto,
      pedidoData.metodo_pago || 'No especificado'
    ];

    try {
      const [result] = await db.execute(query, values);
      return { id: result.insertId, ...pedidoData };
    } catch (error) {
      console.error('Error al guardar el pedido en BD:', error);
      throw new Error('Error de base de datos al guardar pedido');
    }
  }

  // Método opcional para obtener todos los pedidos (para el Dashboard)
  // Incluye la dirección de envío asociada (si existe) mediante LEFT JOIN
  async findAll() {
    const query = `
      SELECT p.*, d.pais, d.municipio, d.ciudad, d.direccion AS direccion_envio
      FROM producto p
      LEFT JOIN direccion d ON d.pedido_id = p.id
      ORDER BY p.fecha_compra DESC
    `;
    try {
      const [rows] = await db.execute(query);
      return rows;
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      throw new Error('Error de base de datos al consultar pedidos');
    }
  }

  // Crea un pedido en estado PENDING antes de abrir el Widget de Wompi
  async createPending(pedidoData) {
    const query = `
      INSERT INTO producto
      (nombre_cliente, apellido_cliente, correo_cliente, telefono_cliente, nombre_producto, precio_producto, talla, metodo_pago, estado_pago)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Wompi', 'PENDING')
    `;

    const values = [
      pedidoData.nombre_cliente,
      pedidoData.apellido_cliente,
      pedidoData.correo_cliente,
      pedidoData.telefono_cliente,
      pedidoData.nombre_producto,
      pedidoData.precio_producto,
      pedidoData.talla || null
    ];

    try {
      const [result] = await db.execute(query, values);
      return { id: result.insertId, ...pedidoData };
    } catch (error) {
      console.error('Error al crear el pedido pendiente en BD:', error);
      throw new Error('Error de base de datos al crear pedido pendiente');
    }
  }

  // Asocia la referencia de Wompi generada al pedido recién creado
  async setReferencia(id, referencia_pago) {
    try {
      await db.execute('UPDATE producto SET referencia_pago = ? WHERE id = ?', [referencia_pago, id]);
    } catch (error) {
      console.error('Error al asociar la referencia de pago:', error);
      throw new Error('Error de base de datos al asociar referencia de pago');
    }
  }

  async findByReferencia(referencia_pago) {
    try {
      const [rows] = await db.execute('SELECT * FROM producto WHERE referencia_pago = ? LIMIT 1', [referencia_pago]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error al buscar pedido por referencia:', error);
      throw new Error('Error de base de datos al buscar pedido por referencia');
    }
  }

  async updateEstadoByReferencia(referencia_pago, { estado_pago, wompi_transaction_id, email_enviado }) {
    try {
      await db.execute(
        'UPDATE producto SET estado_pago = ?, wompi_transaction_id = COALESCE(?, wompi_transaction_id), email_enviado = COALESCE(?, email_enviado) WHERE referencia_pago = ?',
        [estado_pago, wompi_transaction_id || null, typeof email_enviado === 'boolean' ? (email_enviado ? 1 : 0) : null, referencia_pago]
      );
    } catch (error) {
      console.error('Error al actualizar el estado del pedido:', error);
      throw new Error('Error de base de datos al actualizar estado de pedido');
    }
  }
}

module.exports = new PedidoRepository();
