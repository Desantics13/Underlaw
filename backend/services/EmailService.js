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

class EmailService {
  async sendInvoiceEmail(toEmail, clientName, pdfBase64) {
    try {
      // Eliminar el prefijo del Data URI si viene incluido
      const base64Clean = pdfBase64.replace(/^data:application\/pdf;base64,/, '');

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
            filename: 'factura-underlaw.pdf',
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
