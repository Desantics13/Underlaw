// Reglas de negocio del contenido editable del sitio (imágenes por zona y
// videos de Racing). Las zonas son una lista blanca: el Admin no puede crear
// zonas nuevas, porque cada una corresponde a un lugar concreto del front.
const ZONAS_IMAGEN = {
  home_hero: { unica: false },
  home_producto: { unica: true },
  racing_izquierda: { unica: true },
  racing_derecha: { unica: true }
};

const POSICION_POR_DEFECTO = 'center center';
// object-position solo con ejes horizontal + vertical (ej. "center 22%").
const REGEX_POSICION = /^(?:left|center|right) (?:\d{1,3}(?:\.\d{1,2})?%|top|center|bottom)$/;

// Acepta watch?v=, youtu.be/, shorts/, embed/, live/ y v/ en youtube.com,
// m.youtube.com y youtube-nocookie.com. El ID siempre es de 11 caracteres.
const REGEX_YOUTUBE =
  /^https?:\/\/(?:(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/;

class SitioContenido {
  static esZonaValida(zona) {
    return Object.prototype.hasOwnProperty.call(ZONAS_IMAGEN, zona);
  }

  static esZonaUnica(zona) {
    return this.esZonaValida(zona) && ZONAS_IMAGEN[zona].unica;
  }

  static validarZona(zona) {
    if (!this.esZonaValida(zona)) {
      throw new Error('Zona de imagen no válida.');
    }
  }

  // Devuelve una posición segura; si viene vacía usa la que ya había (o la
  // por defecto), y si viene mal formada lanza error.
  static normalizarPosicion(posicion, porDefecto = POSICION_POR_DEFECTO) {
    if (posicion === undefined || posicion === null || String(posicion).trim() === '') {
      return porDefecto;
    }
    const valor = String(posicion).trim();
    if (!REGEX_POSICION.test(valor)) {
      throw new Error('El encuadre de la imagen no es válido.');
    }
    return valor;
  }

  static normalizarAlt(alt) {
    if (alt === undefined || alt === null) return null;
    const valor = String(alt).trim();
    if (valor.length > 200) throw new Error('El texto alternativo no puede pasar de 200 caracteres.');
    return valor || null;
  }

  static normalizarOrden(orden) {
    if (orden === undefined || orden === null || orden === '') return undefined;
    const n = Number(orden);
    if (!Number.isInteger(n) || n < 0 || n > 100000) {
      throw new Error('El orden no es válido.');
    }
    return n;
  }

  // Devuelve el ID de 11 caracteres o null si no es un link de YouTube.
  static extraerIdYoutube(url) {
    const m = String(url || '').trim().match(REGEX_YOUTUBE);
    return m ? m[1] : null;
  }

  // Valida título + link y devuelve el video listo para guardar (link canónico).
  static validarVideo({ titulo, youtube_url }) {
    const tituloLimpio = String(titulo || '').trim();
    if (!tituloLimpio) throw new Error('El título del video es requerido.');
    if (tituloLimpio.length > 150) throw new Error('El título no puede pasar de 150 caracteres.');

    const id = this.extraerIdYoutube(youtube_url);
    if (!id) throw new Error('El link debe ser un video de YouTube (watch?v=, youtu.be/, shorts/, embed/ o live/).');

    return { titulo: tituloLimpio, youtube_url: `https://www.youtube.com/watch?v=${id}` };
  }
}

module.exports = SitioContenido;
