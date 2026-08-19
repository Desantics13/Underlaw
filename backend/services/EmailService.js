const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendInvoiceEmail(toEmail, clientName, pdfBase64) {
    try {
      // Eliminar el prefijo del Data URI si viene incluido
      const base64Clean = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      
      // Convertir a Buffer: es la forma más confiable para adjuntar archivos con Nodemailer
      const pdfBuffer = Buffer.from(base64Clean, 'base64');

      const mailOptions = {
        from: `"Under Law" <${process.env.EMAIL_USER}>`,
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
            content: pdfBuffer,           // Buffer en lugar de string base64
            contentType: 'application/pdf'
          }
        ]
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo enviado exitosamente: ' + info.messageId);
      return true;
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      throw new Error('Error enviando el correo de factura');
    }
  }

  // Fallback sin PDF adjunto, usado por el webhook de Wompi cuando el cliente
  // ya cerró el navegador antes de que el frontend pudiera generar la factura.
  async sendPaymentConfirmationEmail(toEmail, clientName) {
    try {
      const mailOptions = {
        from: `"Under Law" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Pago Confirmado - Under Law',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #000; border-bottom: 1px solid #eee; padding-bottom: 12px;">¡Gracias por tu compra, ${clientName}!</h2>
            <p style="color: #444;">Confirmamos que tu pago en <strong>Under Law</strong> fue aprobado exitosamente.</p>
            <p style="font-size: 0.85em; color: #888; margin-top: 20px; border-top: 1px solid #eee; padding-top: 12px;">© 2026 UNDER LAW — Todos los derechos reservados.</p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Correo de confirmación enviado: ' + info.messageId);
      return true;
    } catch (error) {
      console.error('Error al enviar el correo de confirmación:', error);
      throw new Error('Error enviando el correo de confirmación de pago');
    }
  }
}

module.exports = new EmailService();
