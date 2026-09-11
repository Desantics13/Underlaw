const db = require('../config/db');
const CatalogoProductoImagenRepository = require('./CatalogoProductoImagenRepository');

// Mismo valor que deja la migración para los productos que ya existían.
const DEFAULT_TALLAS = [
  { talla: 'S', cantidad: null },
  { talla: 'M', cantidad: null },
  { talla: 'L', cantidad: null },
  { talla: 'XL', cantidad: null }
];

// mysql2 normalmente ya devuelve la columna JSON parseada; el parse defensivo
// cubre el caso en que llegue como string (mismo patrón que LanzamientoRepository).
function parseTallas(valor) {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];
  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

class CatalogoProductoRepository {
  // Adjunta el arreglo "imagenes" (para el carrusel) a cada producto. Si el
  // producto todavía no tiene filas en catalogo_producto_imagenes (por ejemplo,
  // no se ha corrido la migración de galería), cae de vuelta a su columna
  // "imagen" única para no dejar el carrusel vacío.
  async _conImagenes(productos) {
    if (productos.length === 0) return productos;
    const porProducto = await CatalogoProductoImagenRepository.findByProductoIds(productos.map((p) => p.id));
    return productos.map((p) => ({
      ...p,
      imagenes: porProducto[p.id] && porProducto[p.id].length > 0 ? porProducto[p.id] : (p.imagen ? [p.imagen] : []),
      tallas: parseTallas(p.tallas)
    }));
  }

  // Público: solo productos activos (ver GET /api/catalogo).
  async findAllActivos() {
    const [rows] = await db.execute("SELECT * FROM catalogo_productos WHERE estado = 'activo' ORDER BY id DESC");
    return this._conImagenes(rows);
  }

  // Admin: activos y suspendidos (ver GET /api/catalogo/admin, protegida).
  async findAll() {
    const [rows] = await db.execute('SELECT * FROM catalogo_productos ORDER BY id DESC');
    return this._conImagenes(rows);
  }

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM catalogo_productos WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) return null;
    const [conImagenes] = await this._conImagenes(rows);
    return conImagenes;
  }

  async create({ nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id, descripcion, detalle, tallas, seccion_id }) {
    const [result] = await db.execute(
      `INSERT INTO catalogo_productos
        (nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id, estado, descripcion, detalle, tallas, seccion_id)
       VALUES (?, ?, ?, ?, ?, "activo", ?, ?, ?, ?)`,
      [
        nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id,
        descripcion || null, detalle || null, JSON.stringify(tallas || DEFAULT_TALLAS), seccion_id || null
      ]
    );
    return this.findById(result.insertId);
  }

  async update(id, { nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id, descripcion, detalle, tallas, seccion_id }) {
    const campos = ['nombre_lanzamiento = ?', 'nombre_producto = ?', 'precio = ?', 'descripcion = ?', 'detalle = ?', 'seccion_id = ?'];
    const valores = [nombre_lanzamiento, nombre_producto, precio, descripcion || null, detalle || null, seccion_id || null];

    if (imagen) {
      campos.push('imagen = ?', 'imagen_public_id = ?');
      valores.push(imagen, imagen_public_id);
    }
    if (tallas !== undefined && tallas !== null) {
      campos.push('tallas = ?');
      valores.push(JSON.stringify(tallas));
    }

    valores.push(id);
    await db.execute(`UPDATE catalogo_productos SET ${campos.join(', ')} WHERE id = ?`, valores);
    return this.findById(id);
  }

  // Solo las tallas/cantidades (panel Inventario), sin tocar el resto del producto.
  async updateTallas(id, tallas) {
    await db.execute('UPDATE catalogo_productos SET tallas = ? WHERE id = ?', [JSON.stringify(tallas), id]);
    return this.findById(id);
  }

  async updateEstado(id, estado) {
    await db.execute('UPDATE catalogo_productos SET estado = ? WHERE id = ?', [estado, id]);
    return this.findById(id);
  }

  async delete(id) {
    await db.execute('DELETE FROM catalogo_productos WHERE id = ?', [id]);
  }

  // Mapa { nombre_producto (minúsculas, sin espacios extra) -> precio } de todo
  // el catálogo. Lo usa la factura para poner el precio unitario de cada línea
  // del pedido (que solo guarda el nombre del producto como texto, no su id).
  async preciosPorNombre() {
    const [rows] = await db.execute('SELECT nombre_producto, precio FROM catalogo_productos');
    const mapa = new Map();
    for (const row of rows) {
      mapa.set(String(row.nombre_producto || '').trim().toLowerCase(), Number(row.precio));
    }
    return mapa;
  }
}

module.exports = new CatalogoProductoRepository();
