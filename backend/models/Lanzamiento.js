// Configuración de un LANZAMIENTO (drop) con cuenta regresiva.
//
// OJO: un lanzamiento NO es un producto del catálogo. Es solo la configuración
// programada (nombre, producto, precio, imágenes y fecha/hora) que controla la
// sección destacada del Home. Cuando la fecha se cumple, el servidor crea el
// producto real en "catalogo_productos" (ver services/LanzamientoService.js).
class Lanzamiento {
  static validate(data, { requiereFuturo = false } = {}) {
    if (!data.nombre_lanzamiento || !String(data.nombre_lanzamiento).trim()) {
      throw new Error('El nombre del lanzamiento es requerido.');
    }
    if (!data.nombre_producto || !String(data.nombre_producto).trim()) {
      throw new Error('El nombre del producto es requerido.');
    }
    if (data.precio === undefined || data.precio === null || isNaN(Number(data.precio)) || Number(data.precio) <= 0) {
      throw new Error('El precio debe ser un número mayor a 0.');
    }
    const fecha = new Date(data.fecha_lanzamiento);
    if (!data.fecha_lanzamiento || Number.isNaN(fecha.getTime())) {
      throw new Error('La fecha y hora de lanzamiento no es válida.');
    }
    if (requiereFuturo && fecha.getTime() <= Date.now()) {
      throw new Error('La fecha y hora de lanzamiento debe estar en el futuro.');
    }
  }
}

module.exports = Lanzamiento;
