class Seccion {
  static validate(data) {
    if (!data.nombre || !String(data.nombre).trim()) {
      throw new Error('El nombre de la sección es requerido.');
    }
  }
}

module.exports = Seccion;
