const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const CatalogoProductoRepository = require('../repositories/CatalogoProductoRepository');

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
//
// El diseño de la factura vive en templates/emails/underlaw-invoice-template.html
// (HTML/CSS puro, con el sello de la marca ya incrustado en base64). Acá solo
// se reemplazan los marcadores {{...}} con los datos reales del pedido y se
// renderiza a PDF con Puppeteer, respetando el tamaño carta del diseño.
// ─────────────────────────────────────────────────────────────────────────

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'emails', 'underlaw-invoice-template.html');

// Tamaño exacto del diseño (carta a 96 dpi): 794 x 1123 px
const PAGE_WIDTH_PX = 794;
const PAGE_HEIGHT_PX = 1123;

let templateCache = null;

function loadTemplate() {
  if (templateCache === null) {
    templateCache = fs.readFileSync(TEMPLATE_PATH, 'utf8');
  }
  return templateCache;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatCOP(amount) {
  const n = Number(amount) || 0;
  return `$${n.toLocaleString('es-CO')}`;
}

function formatMoney(amount) {
  return `${formatCOP(amount)} COP`;
}

function formatDate(fecha) {
  const d = new Date(fecha || Date.now());
  const valid = !Number.isNaN(d.getTime()) ? d : new Date();
  return valid.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

// "1x Oversized Buddha Tee, 2x Oversized First" + "M, L"  ->
// [{ cantidad: 1, nombre: 'Oversized Buddha Tee', talla: 'M' }, ...]
function parseItems(pedido) {
  const nombres = String(pedido.nombre_producto || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const tallas = String(pedido.talla || '')
    .split(',')
    .map((s) => s.trim());

  const items = nombres.map((entrada, i) => {
    const match = entrada.match(/^(\d+)\s*x\s*(.+)$/i);
    const cantidad = match ? parseInt(match[1], 10) : 1;
    const nombre = match ? match[2].trim() : entrada;
    const tallaRaw = tallas[i];
    const talla = tallaRaw && tallaRaw.toUpperCase() !== 'N/A' ? tallaRaw : null;
    return { cantidad, nombre, talla };
  });

  return items.length ? items : [{ cantidad: 1, nombre: String(pedido.nombre_producto || 'Producto'), talla: null }];
}

// Normalmente se usa el Chrome que descarga Puppeteer al instalarse (ver
// .puppeteerrc.cjs). Solo si se define PUPPETEER_EXECUTABLE_PATH a un binario
// existente se usa ese en su lugar.
function resolveExecutablePath() {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  return undefined;
}

class InvoiceService {
  // Rellena la plantilla HTML con los datos reales del pedido.
  // preciosPorNombre: Map { nombre_producto en minúsculas -> precio del catálogo }
  // para poner el precio unitario de cada línea (el pedido solo guarda el nombre).
  buildInvoiceHtml(pedido, preciosPorNombre = new Map()) {
    const items = parseItems(pedido);
    const total = Number(pedido.precio_producto) || 0;
    const unSoloProducto = items.length === 1;

    const orderNumber = pedido.referencia_pago || `UL-${pedido.id}`;
    const unidadesTotales = items.reduce((acc, it) => acc + it.cantidad, 0);

    // Precio unitario y valor de cada línea:
    //  - Pedido de UN solo producto: el precio unitario exacto es total/cantidad
    //    (es lo que realmente se cobró) y el valor de la línea es el total. No
    //    hace falta el catálogo y así nunca hay descuadres.
    //  - Pedido de VARIOS productos: la BD no guarda el precio por línea, así que
    //    se toma del catálogo por nombre. Si no se encuentra (producto
    //    renombrado/borrado), esa línea queda sin precio ("—").
    const conPrecio = items.map((it) => {
      if (unSoloProducto) {
        const unitario = it.cantidad ? total / it.cantidad : total;
        return { ...it, unitario, valorLinea: total };
      }
      const delCatalogo = preciosPorNombre.get(it.nombre.trim().toLowerCase());
      const unitario = Number.isFinite(delCatalogo) ? delCatalogo : null;
      const valorLinea = unitario != null ? unitario * it.cantidad : null;
      return { ...it, unitario, valorLinea };
    });

    // ── Cuadro de detalle del producto (arriba a la derecha) ──────────────
    let productName;
    let productSize;
    let quantity;
    if (unSoloProducto) {
      const it = items[0];
      productName = it.nombre;
      productSize = it.talla || 'Única';
      quantity = it.cantidad;
    } else {
      productName = items.map((it) => it.nombre).join(' · ');
      const tallas = items.map((it) => it.talla).filter(Boolean);
      productSize = tallas.length ? tallas.join(' · ') : '—';
      quantity = unidadesTotales;
    }

    // ── Sección "Resumen del Pedido": una línea por producto ──────────────
    let html = loadTemplate();

    const summaryRowRegex = /<div class="summary-line">\s*<span>\{\{quantity\}\}x \{\{productName\}\}<\/span>\s*<span>\{\{lineTotal\}\}<\/span>\s*<\/div>/;
    const summaryRows = conPrecio
      .map((it) => {
        const partes = [`${it.cantidad}x ${escapeHtml(it.nombre)}`];
        if (it.talla) partes.push(`Talla ${escapeHtml(it.talla)}`);
        if (it.unitario != null && it.cantidad > 1) partes.push(`${formatCOP(it.unitario)} c/u`);
        const derecha = it.valorLinea != null ? formatMoney(it.valorLinea) : '—';
        return `<div class="summary-line">\n      <span>${partes.join(' · ')}</span>\n      <span>${derecha}</span>\n    </div>`;
      })
      .join('\n    ');
    html = html.replace(summaryRowRegex, summaryRows);

    // ── Reemplazo del resto de marcadores ────────────────────────────────
    const reemplazos = {
      '{{orderNumber}}': escapeHtml(orderNumber),
      '{{orderDate}}': escapeHtml(formatDate(pedido.fecha_compra)),
      '{{customerName}}': escapeHtml(`${pedido.nombre_cliente || ''} ${pedido.apellido_cliente || ''}`.trim()),
      '{{customerPhone}}': escapeHtml(pedido.telefono_cliente || '—'),
      '{{productName}}': escapeHtml(productName),
      '{{productSize}}': escapeHtml(productSize),
      '{{quantity}}': escapeHtml(quantity),
      '{{subtotal}}': formatMoney(total),
      '{{total}}': formatMoney(total),
      // Sólo se usa si el bloque de líneas del resumen no se pudo reemplazar
      // (plantilla editada): evita que quede un "{{lineTotal}}" literal.
      '{{lineTotal}}': '—'
    };
    for (const [marcador, valor] of Object.entries(reemplazos)) {
      html = html.split(marcador).join(valor);
    }

    return html;
  }

  // Devuelve un Buffer con el PDF de la factura para un pedido ya guardado en BD
  async buildInvoicePdf(pedido) {
    let preciosPorNombre = new Map();
    try {
      preciosPorNombre = await CatalogoProductoRepository.preciosPorNombre();
    } catch (error) {
      console.error('No se pudieron cargar los precios del catálogo para la factura:', error);
    }
    const html = this.buildInvoiceHtml(pedido, preciosPorNombre);

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: resolveExecutablePath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        width: `${PAGE_WIDTH_PX}px`,
        height: `${PAGE_HEIGHT_PX}px`,
        printBackground: true,
        margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  // Conveniencia: arma el PDF y lo devuelve como base64 (mismo formato que espera EmailService)
  async buildInvoicePdfBase64(pedido) {
    const buffer = await this.buildInvoicePdf(pedido);
    return `data:application/pdf;base64,${buffer.toString('base64')}`;
  }
}

module.exports = new InvoiceService();
