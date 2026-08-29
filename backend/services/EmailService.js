const { Resend } = require('resend');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────────────────
// ENVÍO DE CORREOS — Resend (HTTPS), no Gmail SMTP
//
// El envío original usaba Gmail por SMTP directo, pero Railway (y la mayoría
// de plataformas cloud) bloquea las conexiones salientes por el puerto 465 a
// nivel de red para prevenir spam — el pago se confirmaba bien pero el
// correo nunca salía (se quedaba colgado hasta hacer timeout). Resend envía
// los correos vía una API HTTPS normal (puerto 443), que nunca está
// bloqueado, así que evita el problema de raíz.
// ─────────────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'Under Law <onboarding@resend.dev>';
// Buzón interno del equipo, para la notificación que se manda por cada compra
// aprobada (adicional al correo del cliente). Se puede sobreescribir por env.
const INTERNAL_NOTIFICATION_EMAIL = process.env.INTERNAL_NOTIFICATION_EMAIL || 'underlawcompany@gmail.com';

function formatCOP(amount) {
  const n = Number(amount) || 0;
  return `$${n.toLocaleString('es-CO')} COP`;
}

function formatDateTime(fecha) {
  const d = new Date(fecha || Date.now());
  const valid = !Number.isNaN(d.getTime()) ? d : new Date();
  return valid.toLocaleString('es-CO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Bogota'
  });
}

// "factura-<referencia>.pdf" saneado para usar como nombre de adjunto
function toAttachmentFilename(fileName, fallback) {
  const safeName = String(fileName || fallback || 'factura-underlaw')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'factura-underlaw';
  return safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;
}

class EmailService {
  async sendInvoiceEmail(toEmail, clientName, pdfBase64, fileName) {
    try {
      // Eliminar el prefijo del Data URI si viene incluido
      const base64Clean = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      // Nombre del adjunto: "factura-<referencia>.pdf" (o el genérico si no viene)
      const safeName = String(fileName || 'factura-underlaw')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'factura-underlaw';
      const attachmentFilename = safeName.toLowerCase().endsWith('.pdf') ? safeName : `${safeName}.pdf`;

      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject: 'Comprobante de Pago - Under Law',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; border-bottom: 1px solid #eee; padding-bottom: 12px;">¡Gracias por tu compra, ${clientName}!</h2>
            <p style="color: #444;">Tu pedido en <strong>Under Law</strong> ha sido procesado exitosamente.</p>
            <p style="color: #444;">Adjunto a este correo encontrarás tu <strong>factura en PDF</strong> con todos los detalles de tu compra.</p>
            <br/>
            <p style="font-size: 0.85em; color: #888;">Si tienes alguna duda sobre tu pedido, responde directamente a este correo.</p>
            <p style="font-size: 0.85em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px;">© 2026 UNDER LAW — Todos los derechos reservados.</p>
          </div>
        `,
        attachments: [
          {
            filename: attachmentFilename,
            content: base64Clean
          }
        ]
      });

      if (error) throw new Error(error.message || 'Resend devolvió un error al enviar el correo');
      console.log('Correo enviado exitosamente: ' + data?.id);
      return true;
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      throw new Error('Error enviando el correo de factura');
    }
  }

  // Notificación INTERNA para el equipo de Under Law por cada compra aprobada.
  // Es ADICIONAL al correo del cliente y reutiliza el mismo proveedor (Resend)
  // y la misma factura en PDF. Si algo falla acá, quien la llama debe ignorar
  // el error: no puede afectar el correo del cliente ni la confirmación del pago.
  async sendInternalSaleNotificationEmail(pedido, pdfBase64, fileName) {
    const nombreCompleto = `${pedido.nombre_cliente || ''} ${pedido.apellido_cliente || ''}`.trim() || 'Cliente sin nombre';
    const numeroPedido = pedido.referencia_pago || `UL-${pedido.id}`;
    const fechaHora = formatDateTime(pedido.fecha_compra);
    const total = formatCOP(pedido.precio_producto);
    const productos = pedido.nombre_producto || '—';

    const attachments = [];
    if (pdfBase64) {
      const base64Clean = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      attachments.push({
        filename: toAttachmentFilename(fileName, `factura-${numeroPedido}`),
        content: base64Clean
      });
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: INTERNAL_NOTIFICATION_EMAIL,
      subject: `Nueva compra recibida - ${productos}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #000; border-bottom: 1px solid #eee; padding-bottom: 12px;">Nueva compra recibida</h2>
          <table style="border-collapse: collapse; width: 100%; font-size: 0.95em;">
            <tr>
              <td style="padding: 8px 12px; color: #888; white-space: nowrap; vertical-align: top;">Cliente</td>
              <td style="padding: 8px 12px; color: #222;"><strong>${nombreCompleto}</strong></td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 8px 12px; color: #888; white-space: nowrap; vertical-align: top;">Producto(s)</td>
              <td style="padding: 8px 12px; color: #222;">${productos}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #888; white-space: nowrap; vertical-align: top;">Valor total</td>
              <td style="padding: 8px 12px; color: #222;"><strong>${total}</strong></td>
            </tr>
            <tr style="background: #fafafa;">
              <td style="padding: 8px 12px; color: #888; white-space: nowrap; vertical-align: top;">N.º de pedido</td>
              <td style="padding: 8px 12px; color: #222;">${numeroPedido}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; color: #888; white-space: nowrap; vertical-align: top;">Fecha y hora</td>
              <td style="padding: 8px 12px; color: #222;">${fechaHora}</td>
            </tr>
          </table>
          <p style="color: #444; margin-top: 16px;">${attachments.length ? 'Se adjunta la misma factura en PDF enviada al cliente.' : 'No se pudo adjuntar la factura en PDF para esta compra (revisar logs).'}</p>
          <p style="font-size: 0.85em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px;">Notificación interna automática — UNDER LAW.</p>
        </div>
      `,
      ...(attachments.length ? { attachments } : {})
    });

    if (error) throw new Error(error.message || 'Resend devolvió un error al enviar la notificación interna');
    console.log('Notificación interna de compra enviada: ' + data?.id);
    return true;
  }

  // Fallback sin PDF adjunto, usado cuando la generación/envío de la factura falla.
  async sendPaymentConfirmationEmail(toEmail, clientName) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject: 'Pago Confirmado - Under Law',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; border-bottom: 1px solid #eee; padding-bottom: 12px;">¡Gracias por tu compra, ${clientName}!</h2>
            <p style="color: #444;">Confirmamos que tu pago en <strong>Under Law</strong> fue aprobado exitosamente.</p>
            <p style="font-size: 0.85em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px;">© 2026 UNDER LAW — Todos los derechos reservados.</p>
          </div>
        `
      });

      if (error) throw new Error(error.message || 'Resend devolvió un error al enviar el correo');
      console.log('Correo de confirmación enviado: ' + data?.id);
      return true;
    } catch (error) {
      console.error('Error al enviar el correo de confirmación:', error);
      throw new Error('Error enviando el correo de confirmación de pago');
    }
  }
}

module.exports = new EmailService();
