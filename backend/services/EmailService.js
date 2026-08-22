const nodemailer = require('nodemailer');
const dns = require('dns');
require('dotenv').config();

const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const GMAIL_SMTP_PORT = 465;

class EmailService {
  constructor() {
    // La creación del transporter necesita resolver una IP primero (ver abajo),
    // así que queda como una promesa que cada envío espera antes de usarla.
    this.transporterPromise = this._buildTransporter();
  }

  // Resuelve smtp.gmail.com a una IP v4 explícita y se conecta directo a esa IP.
  // Algunos hosts (Railway incluido) no tienen salida IPv6 funcional aunque el
  // DNS resuelva una IP v6 para ese dominio — eso rompía la conexión con
  // ENETUNREACH. Al conectar por una IP v4 ya resuelta no queda ninguna
  // ambigüedad de qué familia usar. "tls.servername" queda igual al hostname
  // real para que la validación del certificado TLS siga funcionando.
  async _buildTransporter() {
    let host = GMAIL_SMTP_HOST;
    try {
      // dns.lookup() usa el resolver del sistema operativo (getaddrinfo), más
      // confiable en distintos entornos/redes que dns.resolve4() (que hace una
      // consulta DNS directa y puede fallar si esa vía está restringida).
      const { address } = await dns.promises.lookup(GMAIL_SMTP_HOST, { family: 4 });
      if (address) host = address;
    } catch (error) {
      console.warn('No se pudo resolver IPv4 de smtp.gmail.com, se usará el hostname directamente:', error.message);
    }

    return nodemailer.createTransport({
      host,
      port: GMAIL_SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        servername: GMAIL_SMTP_HOST
      }
    });
  }

  async sendInvoiceEmail(toEmail, clientName, pdfBase64) {
    try {
      const transporter = await this.transporterPromise;

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

      const info = await transporter.sendMail(mailOptions);
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
      const transporter = await this.transporterPromise;

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

      const info = await transporter.sendMail(mailOptions);
      console.log('Correo de confirmación enviado: ' + info.messageId);
      return true;
    } catch (error) {
      console.error('Error al enviar el correo de confirmación:', error);
      throw new Error('Error enviando el correo de confirmación de pago');
    }
  }
}

module.exports = new EmailService();
