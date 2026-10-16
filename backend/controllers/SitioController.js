const SitioImagenRepository = require('../repositories/SitioImagenRepository');
const SitioVideoRepository = require('../repositories/SitioVideoRepository');
const SitioAjusteRepository = require('../repositories/SitioAjusteRepository');
const CatalogoProductoRepository = require('../repositories/CatalogoProductoRepository');
const LanzamientoRepository = require('../repositories/LanzamientoRepository');
const SitioContenido = require('../models/SitioContenido');
const { imageStorageService } = require('../services/ImageStorageService');

// Carpeta de Cloudinary propia del contenido del sitio (los productos usan
// la carpeta por defecto del servicio).
const CARPETA_SITIO = 'under-law/sitio';

// Lo que el público necesita de una imagen: sin public_id ni zona.
const imagenPublica = ({ id, url, posicion, alt, orden }) => ({ id, url, posicion, alt, orden });

// En el Admin, un error de "tabla no existe" casi siempre es la migración sin
// correr: se dice claro en vez de mostrar el mensaje crudo de MySQL.
const mensajeError = (error, porDefecto) =>
  error && error.code === 'ER_NO_SUCH_TABLE'
    ? 'Falta correr la migración database/migracion-imagenes-sitio.sql en esta base de datos.'
    : (error && error.message) || porDefecto;

const CLAVE_PRODUCTO_DESTACADO = 'producto_destacado_id';

// Producto del bloque de producto del inicio (cuando no hay lanzamiento
// activo): el elegido en el Admin si sigue activo; si no, el activo más
// reciente del catálogo. Cada paso tolera que su tabla aún no exista.
const obtenerProductoDestacado = async () => {
  let idElegido = null;
  try {
    const valor = await SitioAjusteRepository.get(CLAVE_PRODUCTO_DESTACADO);
    idElegido = valor ? Number(valor) : null;
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
  }

  let producto = null;
  if (idElegido) {
    const elegido = await CatalogoProductoRepository.findById(idElegido);
    if (elegido && elegido.estado === 'activo') producto = elegido;
  }
  const elegido = !!producto;
  if (!producto) producto = await CatalogoProductoRepository.findMasRecienteActivo();
  if (!producto) return null;

  let esLanzamiento = false;
  try {
    esLanzamiento = await LanzamientoRepository.existeConProducto(producto.id);
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
  }

  return {
    id: producto.id,
    nombre: producto.nombre_producto,
    descripcion: producto.descripcion || null,
    precio: Number(producto.precio),
    imagen: producto.imagenes?.[0] || producto.imagen || null,
    es_lanzamiento: esLanzamiento,
    elegido
  };
};

// Caché en memoria de la respuesta pública: los visitantes se atienden sin
// consultar la BD. Cualquier escritura del Admin la borra (invalidarCache), y
// el vencimiento acota el desfase si algún día corren varias réplicas.
const CACHE_TTL_MS = 60 * 1000;
let cache = null; // { datos, expira }
// Sube con cada escritura: una lectura que empezó antes no guarda datos viejos.
let versionCache = 0;

class SitioController {
  invalidarCache() {
    cache = null;
    versionCache++;
  }

  // GET /api/sitio -> público. Si las tablas aún no existen (migración sin
  // correr) o la BD falla, responde vacío con 200 para que el front use sus
  // imágenes y videos por defecto.
  async obtener(req, res) {
    try {
      if (!cache || cache.expira <= Date.now()) {
        const version = versionCache;
        const [imagenes, videos] = await Promise.all([
          SitioImagenRepository.findAll(),
          SitioVideoRepository.findAll()
        ]);

        const porZona = {};
        imagenes.forEach((img) => {
          if (!porZona[img.zona]) porZona[img.zona] = [];
          porZona[img.zona].push(imagenPublica(img));
        });

        // Si el catálogo falla, el bloque usa su respaldo pero las imágenes y
        // videos del sitio igual se responden.
        let productoDestacado = null;
        try {
          productoDestacado = await obtenerProductoDestacado();
        } catch (error) {
          console.error('Error al obtener el producto destacado:', error.message);
        }

        const datos = { imagenes: porZona, videos, producto_destacado: productoDestacado };
        if (version !== versionCache) {
          // Hubo una escritura mientras se leía: se responde pero no se guarda.
          res.set('Cache-Control', 'no-cache');
          return res.status(200).json(datos);
        }
        cache = { datos, expira: Date.now() + CACHE_TTL_MS };
      }

      // no-cache: el navegador revalida siempre; si nada cambió, Express
      // responde 304 por el ETag, sin cuerpo.
      res.set('Cache-Control', 'no-cache');
      res.status(200).json(cache.datos);
    } catch (error) {
      console.error('Error al obtener el contenido del sitio:', error.message);
      res.set('Cache-Control', 'no-store');
      res.status(200).json({ imagenes: {}, videos: [], producto_destacado: null });
    }
  }

  // PUT /api/sitio/producto-destacado { producto_id } -> null o "" = automático
  async elegirProductoDestacado(req, res) {
    try {
      const crudo = req.body.producto_id;
      let valor = null;
      if (crudo !== null && crudo !== undefined && crudo !== '') {
        const id = Number(crudo);
        if (!Number.isInteger(id) || id <= 0) {
          return res.status(400).json({ error: 'Producto no válido.' });
        }
        const producto = await CatalogoProductoRepository.findById(id);
        if (!producto) {
          return res.status(404).json({ error: 'Ese producto ya no existe en el catálogo.' });
        }
        if (producto.estado !== 'activo') {
          return res.status(400).json({ error: 'Ese producto está suspendido. Actívalo en Productos o elige otro.' });
        }
        valor = String(id);
      }

      await SitioAjusteRepository.set(CLAVE_PRODUCTO_DESTACADO, valor);
      res.status(200).json({ producto_destacado: await obtenerProductoDestacado() });
    } catch (error) {
      console.error('Error al elegir el producto destacado:', error);
      const mensaje = error && error.code === 'ER_NO_SUCH_TABLE'
        ? 'Falta correr la migración database/migracion-producto-destacado.sql en esta base de datos.'
        : 'Error al guardar el producto destacado';
      res.status(500).json({ error: mensaje });
    }
  }

  // ── Imágenes ───────────────────────────────────────────────────────────

  // POST /api/sitio/imagenes (multipart: imagen + zona, posicion, alt)
  // En zonas de imagen única reemplaza la existente (y borra la vieja de Cloudinary).
  async crearImagen(req, res) {
    let subida = null;
    try {
      const { zona, posicion, alt } = req.body;
      SitioContenido.validarZona(zona);
      if (!req.file) {
        return res.status(400).json({ error: 'Selecciona una imagen para subir.' });
      }

      const anteriores = SitioContenido.esZonaUnica(zona) ? await SitioImagenRepository.findByZona(zona) : [];
      const posicionFinal = SitioContenido.normalizarPosicion(posicion, anteriores[0]?.posicion);
      const altFinal = SitioContenido.normalizarAlt(alt);

      subida = await imageStorageService.uploadImage(req.file, CARPETA_SITIO);
      const creada = await SitioImagenRepository.create({
        zona,
        url: subida.url,
        publicId: subida.publicId,
        posicion: posicionFinal,
        alt: altFinal
      });

      // Recién ahora que la nueva quedó guardada se quitan las anteriores.
      for (const ant of anteriores) {
        await SitioImagenRepository.delete(ant.id);
        imageStorageService.deleteImage(ant.public_id);
      }

      res.status(201).json(imagenPublica(creada));
    } catch (error) {
      if (subida) imageStorageService.deleteImage(subida.publicId);
      console.error('Error al crear imagen del sitio:', error);
      res.status(400).json({ error: mensajeError(error, 'Error al guardar la imagen') });
    }
  }

  // PUT /api/sitio/imagenes/:id (multipart opcional: imagen nueva; o solo posicion/alt/orden)
  async actualizarImagen(req, res) {
    let subida = null;
    try {
      const existente = await SitioImagenRepository.findById(req.params.id);
      if (!existente) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }

      const { posicion, alt, orden } = req.body;
      const campos = {};
      if (posicion !== undefined) campos.posicion = SitioContenido.normalizarPosicion(posicion, existente.posicion);
      if (alt !== undefined) campos.alt = SitioContenido.normalizarAlt(alt);
      const ordenNuevo = SitioContenido.normalizarOrden(orden);
      if (ordenNuevo !== undefined) campos.orden = ordenNuevo;

      if (req.file) {
        subida = await imageStorageService.uploadImage(req.file, CARPETA_SITIO);
        campos.url = subida.url;
        campos.publicId = subida.publicId;
      }

      const actualizada = await SitioImagenRepository.update(existente.id, campos);
      if (subida) imageStorageService.deleteImage(existente.public_id);

      res.status(200).json(imagenPublica(actualizada));
    } catch (error) {
      if (subida) imageStorageService.deleteImage(subida.publicId);
      console.error('Error al actualizar imagen del sitio:', error);
      res.status(400).json({ error: mensajeError(error, 'Error al actualizar la imagen') });
    }
  }

  async eliminarImagen(req, res) {
    try {
      const existente = await SitioImagenRepository.findById(req.params.id);
      if (!existente) {
        return res.status(404).json({ error: 'Imagen no encontrada' });
      }
      await SitioImagenRepository.delete(existente.id);
      imageStorageService.deleteImage(existente.public_id);
      res.status(200).json({ message: 'Imagen eliminada' });
    } catch (error) {
      console.error('Error al eliminar imagen del sitio:', error);
      res.status(500).json({ error: 'Error al eliminar la imagen' });
    }
  }

  // ── Videos ─────────────────────────────────────────────────────────────

  async crearVideo(req, res) {
    try {
      const video = SitioContenido.validarVideo(req.body);
      const creado = await SitioVideoRepository.create({
        ...video,
        orden: SitioContenido.normalizarOrden(req.body.orden)
      });
      res.status(201).json(creado);
    } catch (error) {
      console.error('Error al crear video del sitio:', error);
      res.status(400).json({ error: mensajeError(error, 'Error al crear el video') });
    }
  }

  async actualizarVideo(req, res) {
    try {
      const existente = await SitioVideoRepository.findById(req.params.id);
      if (!existente) {
        return res.status(404).json({ error: 'Video no encontrado' });
      }

      // Título y link se validan siempre juntos; lo que no venga se conserva.
      const video = SitioContenido.validarVideo({
        titulo: req.body.titulo !== undefined ? req.body.titulo : existente.titulo,
        youtube_url: req.body.youtube_url !== undefined ? req.body.youtube_url : existente.youtube_url
      });
      const actualizado = await SitioVideoRepository.update(existente.id, {
        ...video,
        orden: SitioContenido.normalizarOrden(req.body.orden)
      });
      res.status(200).json(actualizado);
    } catch (error) {
      console.error('Error al actualizar video del sitio:', error);
      res.status(400).json({ error: mensajeError(error, 'Error al actualizar el video') });
    }
  }

  async eliminarVideo(req, res) {
    try {
      const existente = await SitioVideoRepository.findById(req.params.id);
      if (!existente) {
        return res.status(404).json({ error: 'Video no encontrado' });
      }
      await SitioVideoRepository.delete(existente.id);
      res.status(200).json({ message: 'Video eliminado' });
    } catch (error) {
      console.error('Error al eliminar video del sitio:', error);
      res.status(500).json({ error: 'Error al eliminar el video' });
    }
  }
}

module.exports = new SitioController();
