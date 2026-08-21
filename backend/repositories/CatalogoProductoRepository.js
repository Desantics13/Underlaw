const db = require('../config/db');

class CatalogoProductoRepository {
  async findAll() {
    const [rows] = await db.execute('SELECT * FROM catalogo_productos ORDER BY id DESC');
    return rows;
  }

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM catalogo_productos WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
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
}

module.exports = new CatalogoProductoRepository();
