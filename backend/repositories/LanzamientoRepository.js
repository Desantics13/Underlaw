const db = require('../config/db');

const DEFAULT_TALLAS = [
  { talla: 'S', cantidad: null },
  { talla: 'M', cantidad: null },
  { talla: 'L', cantidad: null },
  { talla: 'XL', cantidad: null }
];

// "imagenes" y "tallas" son columnas JSON. mysql2 normalmente ya las devuelve
// parseadas; el parse defensivo cubre el caso en que lleguen como string.
function parseJsonArray(valor) {
  if (Array.isArray(valor)) return valor;
  if (!valor) return [];
  try {
    const parsed = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hidratar(row) {
  if (!row) return null;
  const { fecha_lanzamiento_utc, ...resto } = row;
  return {
    ...resto,
    // fecha_lanzamiento_utc viene formateada como ISO UTC directo desde MySQL
    // (ver SELECT), así el frontend puede hacer new Date(...) sin ambigüedad de
    // zona horaria y sin depender de la config de timezone del pool.
    fecha_lanzamiento: fecha_lanzamiento_utc,
    imagenes: parseJsonArray(resto.imagenes),
    tallas: parseJsonArray(resto.tallas)
  };
}

// "%Y-%m-%dT%H:%i:%sZ" -> la T y la Z son literales; devuelve p. ej.
// "2026-09-01T20:30:00Z" (el valor guardado se interpreta como UTC).
const SELECT_LANZAMIENTO =
  "SELECT l.*, DATE_FORMAT(l.fecha_lanzamiento, '%Y-%m-%dT%H:%i:%sZ') AS fecha_lanzamiento_utc FROM lanzamientos l";

class LanzamientoRepository {
  async findAll() {
    const [rows] = await db.execute(`${SELECT_LANZAMIENTO} ORDER BY l.id DESC`);
    return rows.map(hidratar);
  }

  async findById(id) {
    const [rows] = await db.execute(`${SELECT_LANZAMIENTO} WHERE l.id = ? LIMIT 1`, [id]);
    return hidratar(rows[0]);
  }

  // El único lanzamiento marcado para mostrarse en el Home (o null).
  async findActivoHome() {
    const [rows] = await db.execute(`${SELECT_LANZAMIENTO} WHERE l.activo_en_home = 1 ORDER BY l.id DESC LIMIT 1`);
    return hidratar(rows[0]);
  }

  // fecha_lanzamiento: string MySQL 'YYYY-MM-DD HH:MM:SS' ya en UTC.
  async create({ nombre_lanzamiento, nombre_producto, precio, imagenes, fecha_lanzamiento, activo_en_home, descripcion, detalle, tallas, seccion_id }) {
    const [result] = await db.execute(
      `INSERT INTO lanzamientos
        (nombre_lanzamiento, nombre_producto, precio, imagenes, fecha_lanzamiento, activo_en_home, estado, descripcion, detalle, tallas, seccion_id)
       VALUES (?, ?, ?, ?, ?, ?, 'programado', ?, ?, ?, ?)`,
      [
        nombre_lanzamiento, nombre_producto, precio, JSON.stringify(imagenes || []), fecha_lanzamiento, activo_en_home ? 1 : 0,
        descripcion || null, detalle || null, JSON.stringify(tallas || DEFAULT_TALLAS), seccion_id || null
      ]
    );
    // Si se crea ya activo en el Home, apaga cualquier otro que estuviera activo.
    if (activo_en_home) await this.setActivoHome(result.insertId, true);
    return this.findById(result.insertId);
  }

  async update(id, { nombre_lanzamiento, nombre_producto, precio, imagenes, fecha_lanzamiento, descripcion, detalle, tallas, seccion_id }) {
    const campos = ['nombre_lanzamiento = ?', 'nombre_producto = ?', 'precio = ?', 'imagenes = ?', 'fecha_lanzamiento = ?', 'descripcion = ?', 'detalle = ?', 'seccion_id = ?'];
    const valores = [nombre_lanzamiento, nombre_producto, precio, JSON.stringify(imagenes || []), fecha_lanzamiento, descripcion || null, detalle || null, seccion_id || null];

    if (tallas !== undefined && tallas !== null) {
      campos.push('tallas = ?');
      valores.push(JSON.stringify(tallas));
    }

    valores.push(id);
    await db.execute(`UPDATE lanzamientos SET ${campos.join(', ')} WHERE id = ?`, valores);
    return this.findById(id);
  }

  // Solo las tallas/cantidades (panel Inventario), sin tocar el resto del lanzamiento.
  async updateTallas(id, tallas) {
    await db.execute('UPDATE lanzamientos SET tallas = ? WHERE id = ?', [JSON.stringify(tallas), id]);
    return this.findById(id);
  }

  // Solo un lanzamiento puede estar activo en el Home a la vez. Un solo UPDATE
  // atómico deja el objetivo en 1 y todos los demás en 0 (o simplemente apaga
  // este si activo = false).
  async setActivoHome(id, activo) {
    if (activo) {
      await db.execute('UPDATE lanzamientos SET activo_en_home = IF(id = ?, 1, 0)', [id]);
    } else {
      await db.execute('UPDATE lanzamientos SET activo_en_home = 0 WHERE id = ?', [id]);
    }
    return this.findById(id);
  }

  // Marca el lanzamiento como "lanzado" SOLO si todavía estaba "programado".
  // Devuelve affectedRows: 1 = este llamador ganó la carrera y debe crear el
  // producto; 0 = otro tick/otra request ya lo hizo (idempotencia).
  async marcarLanzado(id) {
    const [result] = await db.execute(
      "UPDATE lanzamientos SET estado = 'lanzado' WHERE id = ? AND estado = 'programado'",
      [id]
    );
    return result.affectedRows;
  }

  async setProductoId(id, productoId) {
    await db.execute('UPDATE lanzamientos SET producto_id = ? WHERE id = ?', [productoId, id]);
  }

  async findVencidosProgramados() {
    const [rows] = await db.execute(
      "SELECT id FROM lanzamientos WHERE estado = 'programado' AND fecha_lanzamiento <= UTC_TIMESTAMP()"
    );
    return rows.map((r) => r.id);
  }

  async delete(id) {
    await db.execute('DELETE FROM lanzamientos WHERE id = ?', [id]);
  }
}

module.exports = new LanzamientoRepository();
