const db = require('../config/db');
const CatalogoProductoImagenRepository = require('./CatalogoProductoImagenRepository');

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
      imagenes: porProducto[p.id] && porProducto[p.id].length > 0 ? porProducto[p.id] : (p.imagen ? [p.imagen] : [])
    }));
  }

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

  async create({ nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id }) {
    const [result] = await db.execute(
      'INSERT INTO catalogo_productos (nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id, estado) VALUES (?, ?, ?, ?, ?, "activo")',
      [nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id]
    );
    return this.findById(result.insertId);
  }

  async update(id, { nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id }) {
    if (imagen) {
      await db.execute('UPDATE catalogo_productos SET nombre_lanzamiento = ?, nombre_producto = ?, precio = ?, imagen = ?, imagen_public_id = ? WHERE id = ?', [nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id, id]);
    } else {
      await db.execute('UPDATE catalogo_productos SET nombre_lanzamiento = ?, nombre_producto = ?, precio = ? WHERE id = ?', [nombre_lanzamiento, nombre_producto, precio, id]);
    }
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
