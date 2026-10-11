import { useEffect, useState } from 'react';
import { API_URL } from './adminApi';

// ─────────────────────────────────────────────────────────────────────────
// CONTENIDO EDITABLE DEL SITIO (pestaña "Imágenes" del Admin)
//
// Home y Racing leen de GET /api/sitio las imágenes por zona y los videos de
// Racing. Si la zona viene vacía, o el backend/las tablas fallan, cada página
// usa sus imágenes empaquetadas de respaldo: el sitio se ve igual que antes.
// ─────────────────────────────────────────────────────────────────────────

const VACIO = { imagenes: {}, videos: [] };

// Si el backend tarda más que esto, las páginas pintan sus respaldos y, si la
// respuesta llega después, cambian a lo que venga (sin quedarse en blanco).
const ESPERA_MAXIMA_MS = 1200;

let cache = null;
let promesa = null;

const normalizar = (data) => ({
  imagenes: data && typeof data.imagenes === 'object' && data.imagenes ? data.imagenes : {},
  videos: Array.isArray(data?.videos) ? data.videos : []
});

// Una sola petición por carga de página; el resultado queda en memoria.
export const cargarSitioContenido = () => {
  if (cache) return Promise.resolve(cache);
  if (!promesa) {
    promesa = fetch(`${API_URL}/api/sitio`)
      .then((res) => (res.ok ? res.json() : VACIO))
      .then(normalizar)
      .catch(() => VACIO)
      .then((contenido) => {
        cache = contenido;
        return contenido;
      });
  }
  return promesa;
};

// El Admin lo llama tras guardar cambios para que Home/Racing vuelvan a pedirlo.
export const invalidarSitioContenido = () => {
  cache = null;
  promesa = null;
};

// { imagenes, videos, listo }. "listo" pasa a true cuando llegó la respuesta o
// se agotó la espera máxima; hasta entonces las páginas evitan pintar el
// respaldo para no mostrar un "destello" de la imagen equivocada.
export const useSitioContenido = () => {
  const [estado, setEstado] = useState(() => ({ contenido: cache || VACIO, listo: !!cache }));

  useEffect(() => {
    let vivo = true;
    cargarSitioContenido().then((contenido) => {
      if (vivo) setEstado({ contenido, listo: true });
    });
    const timer = setTimeout(() => {
      if (vivo) setEstado((prev) => (prev.listo ? prev : { ...prev, listo: true }));
    }, ESPERA_MAXIMA_MS);
    return () => {
      vivo = false;
      clearTimeout(timer);
    };
  }, []);

  return { imagenes: estado.contenido.imagenes, videos: estado.contenido.videos, listo: estado.listo };
};

// Cloudinary: pide formato y calidad automáticos y limita el ancho, para que
// lo que se suba al panel pese poco. Cualquier otra URL se devuelve igual.
export const optimizarImagen = (url, ancho = 1600) => {
  if (typeof url !== 'string' || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url;
  if (/\/image\/upload\/[^/]*(?:f_auto|q_auto)/.test(url)) return url;
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${ancho}/`);
};

// Misma regla que valida el backend: devuelve el ID de 11 caracteres o null.
const REGEX_YOUTUBE =
  /^https?:\/\/(?:(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#\s]*&)?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&#/].*)?$/;

export const extraerIdYoutube = (url) => {
  const m = String(url || '').trim().match(REGEX_YOUTUBE);
  return m ? m[1] : null;
};
