const PedidoRepository = require('../repositories/PedidoRepository');
const DireccionRepository = require('../repositories/DireccionRepository');
const NotificacionRepository = require('../repositories/NotificacionRepository');
const EmailService = require('../services/EmailService');
const InvoiceService = require('../services/InvoiceService');
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
      // Una talla por línea del carrito, en el mismo orden que nombre_producto
      const talla = cart.map(item => item.talla || 'N/A').join(', ');

      const pedidoData = {
        nombre_cliente: formData.name,
        apellido_cliente: formData.lastName,
        correo_cliente: formData.email,
        telefono_cliente: formData.phone,
        nombre_producto,
        precio_producto,
        talla
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

      await this._reconciliarPedido(pedido, 'APPROVED', null, pdfBase64);

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

      await this._reconciliarPedido(pedido, estado_pago || 'VOIDED', null, null);

      res.status(200).json({ message: 'Pedido marcado como cancelado' });
    } catch (error) {
      console.error('Error en cancelarPago:', error);
      res.status(500).json({ error: error.message || 'Error interno al cancelar el pago' });
    }
  }

  // 2.6. El frontend llama esto para verificar el estado real de un pedido por su
  //      referencia. Es la pieza clave para métodos de pago (Nequi, PSE, etc.) que
  //      sacan al usuario de la página: al volver, en vez de esperar a que llegue
  //      el webhook (que puede tardar), si todavía figura PENDING acá y llega un
  //      transactionId (Wompi lo agrega solo al redirectUrl), se consulta el
  //      estado directo en la API de Wompi para responder al instante.
  async consultarEstado(req, res) {
    try {
      const { reference } = req.params;
      const { transactionId } = req.query;

      let pedido = await PedidoRepository.findByReferencia(reference);
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado para esa referencia' });
      }

      if (pedido.estado_pago === 'PENDING' && transactionId) {
        try {
          const transaccion = await WompiService.consultarTransaccion(transactionId);
          if (transaccion && transaccion.status && transaccion.status !== 'PENDING') {
            await this._reconciliarPedido(pedido, transaccion.status, transaccion.id, null);
            pedido = await PedidoRepository.findByReferencia(reference);
          }
        } catch (wompiError) {
          console.error('Error al consultar la transacción directo en Wompi:', wompiError);
        }
      }

      res.status(200).json({ estado_pago: pedido.estado_pago, email_enviado: !!pedido.email_enviado });
    } catch (error) {
      console.error('Error en consultarEstado:', error);
      res.status(500).json({ error: 'Error al consultar el estado del pedido' });
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

      await this._reconciliarPedido(pedido, transaction.status, transaction.id, null);

      res.status(200).json({ message: 'Evento procesado' });
    } catch (error) {
      console.error('Error en webhook de Wompi:', error);
      res.status(500).json({ error: 'Error interno procesando el webhook' });
    }
  }

  // ── Lógica compartida ──────────────────────────────────────────────────
  // La usan los tres caminos por los que nos podemos enterar de un pago (el
  // callback del Widget vía confirmarPago, la consulta directa a Wompi al
  // volver de un pago que sacó al cliente de la página, y el webhook oficial)
  // para no duplicar la lógica de notificar al Admin y mandar la factura.
  async _reconciliarPedido(pedido, nuevoEstado, wompiTransactionId, pdfBase64FrontEnd) {
    const yaEstabaAprobado = pedido.estado_pago === 'APPROVED';

    await PedidoRepository.updateEstadoByReferencia(pedido.referencia_pago, {
      estado_pago: nuevoEstado,
      wompi_transaction_id: wompiTransactionId
    });

    // Notifica al Admin solo la primera vez que este pedido queda aprobado
    // (evita duplicados si más de un camino llega a confirmarlo).
    if (nuevoEstado === 'APPROVED' && !yaEstabaAprobado) {
      await NotificacionRepository.create(
        `Nueva compra de ${pedido.nombre_cliente} ${pedido.apellido_cliente} — ${pedido.nombre_producto}`
      );
    }

    if (nuevoEstado === 'APPROVED' && !pedido.email_enviado) {
      await this._enviarFactura(pedido, pdfBase64FrontEnd);
    }
  }

  // El envío del correo se intenta aparte: si falla no debe impedir que el pago
  // quede marcado como APROBADO — eso es lo que ya cobró Wompi. La factura se
  // arma siempre en el servidor (con los datos ya guardados en BD y el diseño
  // de marca), sin importar el método de pago ni si el cliente cerró la
  // pestaña. Si hasta eso falla, se manda al menos un aviso simple.
  async _enviarFactura(pedido, _pdfBase64FrontEnd) {
    try {
      const facturaPdf = await InvoiceService.buildInvoicePdfBase64(pedido);
      await EmailService.sendInvoiceEmail(
        pedido.correo_cliente,
        `${pedido.nombre_cliente} ${pedido.apellido_cliente}`,
        facturaPdf,
        `factura-${pedido.referencia_pago || 'UL-' + pedido.id}`
      );
      await PedidoRepository.updateEstadoByReferencia(pedido.referencia_pago, {
        estado_pago: 'APPROVED',
        email_enviado: true
      });
    } catch (emailError) {
      console.error('Error al generar/enviar la factura, se intenta el correo simple de respaldo:', emailError);
      try {
        await EmailService.sendPaymentConfirmationEmail(
          pedido.correo_cliente,
          `${pedido.nombre_cliente} ${pedido.apellido_cliente}`
        );
        await PedidoRepository.updateEstadoByReferencia(pedido.referencia_pago, {
          estado_pago: 'APPROVED',
          email_enviado: true
        });
      } catch (fallbackError) {
        console.error('Error también en el correo de respaldo (el pago sí queda confirmado):', fallbackError);
      }
    }
  }
}

module.exports = new WompiController();
