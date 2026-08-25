const db = require('../config/db');

class CatalogoProductoImagenRepository {
  // Devuelve las imágenes de un producto del catálogo, en orden de carrusel
  async findByProductoId(catalogoProductoId) {
    try {
      const [rows] = await db.execute(
        'SELECT id, imagen, imagen_public_id FROM catalogo_producto_imagenes WHERE catalogo_producto_id = ? ORDER BY orden ASC, id ASC',
        [catalogoProductoId]
      );
      return rows;
    } catch (error) {
      console.error('Error al obtener las imágenes del producto:', error);
      throw new Error('Error de base de datos al obtener las imágenes del producto');
    }
  }

  // Devuelve { catalogoProductoId: [url, url, ...] } para varios productos a la vez
  async findByProductoIds(catalogoProductoIds) {
    if (catalogoProductoIds.length === 0) return {};
    try {
      const placeholders = catalogoProductoIds.map(() => '?').join(', ');
      const [rows] = await db.execute(
        `SELECT catalogo_producto_id, imagen FROM catalogo_producto_imagenes WHERE catalogo_producto_id IN (${placeholders}) ORDER BY orden ASC, id ASC`,
        catalogoProductoIds
      );
      const porProducto = {};
      rows.forEach((row) => {
        if (!porProducto[row.catalogo_producto_id]) porProducto[row.catalogo_producto_id] = [];
        porProducto[row.catalogo_producto_id].push(row.imagen);
      });
      return porProducto;
    } catch (error) {
      console.error('Error al obtener las imágenes de los productos:', error);
      throw new Error('Error de base de datos al obtener las imágenes de los productos');
    }
  }

  // imagenes: [{ url, publicId }, ...], se guardan en ese mismo orden
  async insertMany(catalogoProductoId, imagenes) {
    if (!imagenes || imagenes.length === 0) return;
    try {
      const placeholders = imagenes.map(() => '(?, ?, ?, ?)').join(', ');
      const params = imagenes.flatMap((img, index) => [catalogoProductoId, img.url, img.publicId, index]);
      await db.execute(
        `INSERT INTO catalogo_producto_imagenes (catalogo_producto_id, imagen, imagen_public_id, orden) VALUES ${placeholders}`,
        params
      );
    } catch (error) {
      console.error('Error al guardar las imágenes del producto:', error);
      throw new Error('Error de base de datos al guardar las imágenes del producto');
    }
  }

  async deleteByProductoId(catalogoProductoId) {
    try {
      await db.execute('DELETE FROM catalogo_producto_imagenes WHERE catalogo_producto_id = ?', [catalogoProductoId]);
    } catch (error) {
      console.error('Error al borrar las imágenes del producto:', error);
      throw new Error('Error de base de datos al borrar las imágenes del producto');
    }
  }
}

module.exports = new CatalogoProductoImagenRepository();
