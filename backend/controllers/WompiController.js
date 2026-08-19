const PedidoRepository = require('../repositories/PedidoRepository');
const EmailService = require('../services/EmailService');
const WompiService = require('../services/WompiService');
const Pedido = require('../models/Pedido');
const wompiConfig = require('../config/wompi');

class WompiController {
  // 1. El frontend llama esto al entrar al paso de pago: crea el pedido en
  //    estado PENDING y devuelve todo lo necesario para abrir el Widget de Wompi.
  async iniciarPago(req, res) {
    try {
      const { formData, cart } = req.body;

      if (!formData || !cart || cart.length === 0) {
        return res.status(400).json({ error: 'Faltan datos requeridos (formData, cart)' });
      }

      const nombre_producto = cart.map(item => `${item.quantity}x ${item.name}`).join(', ');
      const precio_producto = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

      const pedidoData = {
        nombre_cliente: formData.name,
        apellido_cliente: formData.lastName,
        correo_cliente: formData.email,
        telefono_cliente: formData.phone,
        nombre_producto,
        precio_producto
      };

      Pedido.validate(pedidoData);

      const pedido = await PedidoRepository.createPending(pedidoData);
      const referencia_pago = WompiService.buildReference(pedido.id);
      await PedidoRepository.setReferencia(pedido.id, referencia_pago);

      const amountInCents = Math.round(precio_producto * 100);
      const signature = WompiService.generateIntegritySignature(referencia_pago, amountInCents, wompiConfig.currency);

      res.status(201).json({
        reference: referencia_pago,
        amountInCents,
        currency: wompiConfig.currency,
        publicKey: wompiConfig.publicKey,
        signature
      });
    } catch (error) {
      console.error('Error en iniciarPago:', error);
      res.status(500).json({ error: error.message || 'Error interno al iniciar el pago' });
    }
  }

  // 2. El frontend llama esto justo después de que el Widget devuelve un resultado
  //    APROBADO, adjuntando la factura en PDF generada en el navegador.
  async confirmarPago(req, res) {
    try {
      const { reference, pdfBase64 } = req.body;
      if (!reference) {
        return res.status(400).json({ error: 'Falta la referencia del pago' });
      }

      const pedido = await PedidoRepository.findByReferencia(reference);
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado para esa referencia' });
      }

      await PedidoRepository.updateEstadoByReferencia(reference, {
        estado_pago: 'APPROVED',
        email_enviado: true
      });

      if (pdfBase64) {
        await EmailService.sendInvoiceEmail(
          pedido.correo_cliente,
          `${pedido.nombre_cliente} ${pedido.apellido_cliente}`,
          pdfBase64
        );
      }

      res.status(200).json({ message: 'Pedido confirmado', pedidoId: pedido.id });
    } catch (error) {
      console.error('Error en confirmarPago:', error);
      res.status(500).json({ error: error.message || 'Error interno al confirmar el pago' });
    }
  }

  // 3. Webhook oficial de Wompi (evento "transaction.updated"). Es la fuente de
  //    verdad: automatiza la confirmación aunque el cliente cierre el navegador.
  async webhook(req, res) {
    try {
      const event = req.body;

      if (!WompiService.verifyEventChecksum(event)) {
        console.warn('Webhook de Wompi con checksum inválido, ignorado.');
        return res.status(400).json({ error: 'Checksum inválido' });
      }

      const transaction = event.data?.transaction;
      if (!transaction) {
        return res.status(400).json({ error: 'Evento sin transacción' });
      }

      const pedido = await PedidoRepository.findByReferencia(transaction.reference);
      if (!pedido) {
        console.warn(`Webhook de Wompi: no existe pedido para la referencia ${transaction.reference}`);
        return res.status(200).json({ message: 'Referencia no encontrada, ignorado' });
      }

      await PedidoRepository.updateEstadoByReferencia(transaction.reference, {
        estado_pago: transaction.status,
        wompi_transaction_id: transaction.id
      });

      // Fallback: si aprobó y el frontend nunca alcanzó a mandar la factura
      // (p. ej. el cliente cerró la pestaña), igual le confirmamos por correo.
      if (transaction.status === 'APPROVED' && !pedido.email_enviado) {
        await EmailService.sendPaymentConfirmationEmail(
          pedido.correo_cliente,
          `${pedido.nombre_cliente} ${pedido.apellido_cliente}`
        );
        await PedidoRepository.updateEstadoByReferencia(transaction.reference, {
          estado_pago: transaction.status,
          wompi_transaction_id: transaction.id,
          email_enviado: true
        });
      }

      res.status(200).json({ message: 'Evento procesado' });
    } catch (error) {
      console.error('Error en webhook de Wompi:', error);
      res.status(500).json({ error: 'Error interno procesando el webhook' });
    }
  }
}

module.exports = new WompiController();
