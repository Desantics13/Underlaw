const PedidoRepository = require('../repositories/PedidoRepository');
const DireccionRepository = require('../repositories/DireccionRepository');
const NotificacionRepository = require('../repositories/NotificacionRepository');
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

      // Guarda la dirección de envío asociada a este pedido (si vino en el formulario)
      if (formData.pais && formData.municipio && formData.ciudad && formData.direccion) {
        await DireccionRepository.save(pedido.id, {
          pais: formData.pais,
          municipio: formData.municipio,
          ciudad: formData.ciudad,
          direccion: formData.direccion
        });
      }

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

      // El envío del correo se intenta aparte: si falla (Gmail caído, etc.) no debe
      // impedir que el pago quede marcado como APROBADO — eso es lo que ya cobró Wompi.
      let email_enviado = false;
      if (pdfBase64) {
        try {
          await EmailService.sendInvoiceEmail(
            pedido.correo_cliente,
            `${pedido.nombre_cliente} ${pedido.apellido_cliente}`,
            pdfBase64
          );
          email_enviado = true;
        } catch (emailError) {
          console.error('Error al enviar la factura por correo (el pago sí queda confirmado):', emailError);
        }
      }

      await PedidoRepository.updateEstadoByReferencia(reference, {
        estado_pago: 'APPROVED',
        email_enviado
      });

      // Notifica al Admin solo la primera vez que este pedido queda aprobado
      // (evita duplicados si el webhook de Wompi también llega a confirmarlo).
      if (pedido.estado_pago !== 'APPROVED') {
        await NotificacionRepository.create(
          `Nueva compra de ${pedido.nombre_cliente} ${pedido.apellido_cliente} — ${pedido.nombre_producto}`
        );
      }

      res.status(200).json({ message: 'Pedido confirmado', pedidoId: pedido.id });
    } catch (error) {
      console.error('Error en confirmarPago:', error);
      res.status(500).json({ error: error.message || 'Error interno al confirmar el pago' });
    }
  }

  // 2.5. El frontend llama esto cuando el cliente cierra el Widget sin pagar o
  //      el pago es rechazado/anulado, para reflejar el estado real en el Admin.
  async cancelarPago(req, res) {
    try {
      const { reference, estado_pago } = req.body;
      if (!reference) {
        return res.status(400).json({ error: 'Falta la referencia del pago' });
      }

      const pedido = await PedidoRepository.findByReferencia(reference);
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado para esa referencia' });
      }

      // No sobreescribir un pedido que ya fue aprobado
      if (pedido.estado_pago === 'APPROVED') {
        return res.status(200).json({ message: 'El pedido ya estaba aprobado, no se modifica' });
      }

      await PedidoRepository.updateEstadoByReferencia(reference, {
        estado_pago: estado_pago || 'VOIDED'
      });

      res.status(200).json({ message: 'Pedido marcado como cancelado' });
    } catch (error) {
      console.error('Error en cancelarPago:', error);
      res.status(500).json({ error: error.message || 'Error interno al cancelar el pago' });
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

      const yaEstabaAprobado = pedido.estado_pago === 'APPROVED';

      await PedidoRepository.updateEstadoByReferencia(transaction.reference, {
        estado_pago: transaction.status,
        wompi_transaction_id: transaction.id
      });

      // Notifica al Admin solo la primera vez que este pedido queda aprobado
      // (si el frontend ya lo había confirmado antes, no se duplica el aviso).
      if (transaction.status === 'APPROVED' && !yaEstabaAprobado) {
        await NotificacionRepository.create(
          `Nueva compra de ${pedido.nombre_cliente} ${pedido.apellido_cliente} — ${pedido.nombre_producto}`
        );
      }

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
