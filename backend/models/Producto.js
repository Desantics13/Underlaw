const DETALLE_MAX = 120;

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
    if (data.detalle !== undefined && data.detalle !== null && String(data.detalle).length > DETALLE_MAX) {
      throw new Error(`El detalle no puede superar los ${DETALLE_MAX} caracteres.`);
    }
  }

  // tallas: [{ talla, cantidad }, ...]. cantidad null = "sin contar" (se vende
  // sin límite); cantidad 0, 1, 2... es el stock real controlado. Lanza si el
  // formato no es válido; devuelve null si no vino nada (el llamador decide
  // el valor por defecto).
  static parseTallas(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    let lista = raw;
    if (typeof raw === 'string') {
      try {
        lista = JSON.parse(raw);
      } catch {
        throw new Error('Formato inválido de tallas.');
      }
    }
    if (!Array.isArray(lista)) {
      throw new Error('Formato inválido de tallas.');
    }
    return lista.map((t) => {
      const talla = String(t?.talla ?? '').trim();
      if (!talla) throw new Error('Cada talla debe tener un nombre.');

      const cantidadRaw = t?.cantidad;
      if (cantidadRaw === null || cantidadRaw === undefined || cantidadRaw === '') {
        return { talla, cantidad: null };
      }
      const cantidad = Number(cantidadRaw);
      if (!Number.isInteger(cantidad) || cantidad < 0) {
        throw new Error(`La cantidad de la talla ${talla} debe ser un entero mayor o igual a 0.`);
      }
      return { talla, cantidad };
    });
  }

  // El público nunca ve la cantidad exacta en stock: solo si esa talla se
  // puede comprar y el máximo que se puede pedir de una vez (tope de 10, o el
  // stock real si es menor). cantidad null ("sin contar") = siempre disponible.
  static sanitizarTallasPublicas(tallas) {
    if (!Array.isArray(tallas)) return [];
    return tallas.map(({ talla, cantidad }) => ({
      talla,
      disponible: cantidad === null || cantidad === undefined || cantidad > 0,
      max_compra: cantidad === null || cantidad === undefined ? 10 : Math.min(cantidad, 10)
    }));
  }
}

module.exports = Producto;
