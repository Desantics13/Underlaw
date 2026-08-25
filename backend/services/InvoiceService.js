const PDFDocument = require('pdfkit');

// ─────────────────────────────────────────────────────────────────────────
// Genera la factura en PDF del lado del SERVIDOR, a partir de lo que ya
// quedó guardado en la base de datos para ese pedido.
//
// Esto existe porque la versión original solo generaba el PDF en el
// NAVEGADOR del cliente (con los datos del carrito en memoria). Para
// métodos de pago que sacan al cliente de la página (Nequi, PSE), el
// navegador se recarga al volver y esa información se pierde — así que el
// correo de confirmación se enviaba sin factura adjunta. Generándolo acá,
// con los datos ya persistidos, la factura llega siempre, sin importar el
// método de pago ni si el cliente cerró la pestaña.
// ─────────────────────────────────────────────────────────────────────────

class InvoiceService {
  // Devuelve un Buffer con el PDF de la factura para un pedido ya guardado en BD
  async buildInvoicePdf(pedido) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(22).text('Factura - UNDER LAW', { align: 'left' });
        doc.moveDown(1);

        doc.fontSize(11);
        doc.text(`Fecha: ${new Date(pedido.fecha_compra || Date.now()).toLocaleDateString('es-CO')}`);
        doc.text(`Cliente: ${pedido.nombre_cliente} ${pedido.apellido_cliente}`);
        doc.text(`Correo: ${pedido.correo_cliente}`);
        if (pedido.telefono_cliente) doc.text(`Teléfono: ${pedido.telefono_cliente}`);
        doc.text(`Referencia: ${pedido.referencia_pago || '—'}`);

        doc.moveDown(1.2);
        doc.fontSize(13).text('Productos:');
        doc.moveDown(0.3);
        doc.fontSize(11);
        const items = String(pedido.nombre_producto || '').split(',').map(i => i.trim()).filter(Boolean);
        const tallas = String(pedido.talla || '').split(',').map(t => t.trim()).filter(Boolean);
        (items.length ? items : [pedido.nombre_producto]).forEach((item, index) => {
          const talla = tallas[index] && tallas[index] !== 'N/A' ? ` (Talla: ${tallas[index]})` : '';
          doc.text(`• ${item}${talla}`);
        });

        doc.moveDown(1);
        doc.fontSize(15).text(`Total: $${Number(pedido.precio_producto).toLocaleString('es-CO')} COP`, { align: 'left' });

        doc.moveDown(2);
        doc.fontSize(9).fillColor('#888888').text('© Under Law — Gracias por tu compra.');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Conveniencia: arma el PDF y lo devuelve como base64 (mismo formato que espera EmailService)
  async buildInvoicePdfBase64(pedido) {
    const buffer = await this.buildInvoicePdf(pedido);
    return `data:application/pdf;base64,${buffer.toString('base64')}`;
  }
}

module.exports = new InvoiceService();
