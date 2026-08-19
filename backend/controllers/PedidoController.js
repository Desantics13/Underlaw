const PedidoRepository = require('../repositories/PedidoRepository');
const EmailService = require('../services/EmailService');
const Pedido = require('../models/Pedido');

class PedidoController {
  async crearPedido(req, res) {
    try {
      const { formData, cart, pdfBase64, paymentMethod } = req.body;

      if (!formData || !cart || !pdfBase64) {
        return res.status(400).json({ error: 'Faltan datos requeridos (formData, cart, pdfBase64)' });
      }

      const nombre_producto = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');
      const precio_producto = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
      const metodo_pago = paymentMethod === 'pse' ? 'PSE' : 'Tarjeta de Crédito/Débito';

      const pedidoData = {
        nombre_cliente: formData.name,
        apellido_cliente: formData.lastName,
        correo_cliente: formData.email,
        telefono_cliente: formData.phone,
        nombre_producto,
        precio_producto,
        metodo_pago
      };

      // 1. Validar Modelo
      Pedido.validate(pedidoData);

      // 2. Guardar en Base de Datos a través del Repositorio
      const savedPedido = await PedidoRepository.save(pedidoData);

      // 3. Enviar Correo con la factura adjunta
      await EmailService.sendInvoiceEmail(
        pedidoData.correo_cliente, 
        `${pedidoData.nombre_cliente} ${pedidoData.apellido_cliente}`, 
        pdfBase64
      );

      res.status(201).json({ 
        message: 'Pedido procesado exitosamente', 
        pedidoId: savedPedido.id 
      });

    } catch (error) {
      console.error('Error en crearPedido Controller:', error);
      res.status(500).json({ error: error.message || 'Error interno del servidor al procesar el pedido' });
    }
  }

  // Método opcional para listar pedidos (para el Dashboard)
  async listarPedidos(req, res) {
    try {
      const pedidos = await PedidoRepository.findAll();
      res.status(200).json(pedidos);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  }
}

module.exports = new PedidoController();
