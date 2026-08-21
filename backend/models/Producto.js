class Producto {
  constructor({ id, nombre_lanzamiento, nombre_producto, precio, imagen, estado, fecha_creacion }) {
    this.id = id || null;
    this.nombre_lanzamiento = nombre_lanzamiento;
    this.nombre_producto = nombre_producto;
    this.precio = precio;
    this.imagen = imagen || null;
    this.estado = estado || 'activo';
    this.fecha_creacion = fecha_creacion || new Date();
  }

  static validate(data) {
    if (!data.nombre_lanzamiento || !String(data.nombre_lanzamiento).trim()) {
      throw new Error('El nombre del lanzamiento es requerido.');
    }
    if (!data.nombre_producto || !String(data.nombre_producto).trim()) {
      throw new Error('El nombre del producto es requerido.');
    }
    if (data.precio === undefined || data.precio === null || isNaN(Number(data.precio)) || Number(data.precio) <= 0) {
      throw new Error('El precio debe ser un número mayor a 0.');
    }
  }
}

module.exports = Producto;
