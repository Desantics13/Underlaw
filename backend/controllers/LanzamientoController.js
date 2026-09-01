const LanzamientoRepository = require('../repositories/LanzamientoRepository');
const LanzamientoInscritoRepository = require('../repositories/LanzamientoInscritoRepository');
const LanzamientoService = require('../services/LanzamientoService');
const Lanzamiento = require('../models/Lanzamiento');
const { imageStorageService } = require('../services/ImageStorageService');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_RE = /^[0-9+\-\s()]{7,20}$/;

// Convierte un ISO ('2026-09-01T20:30:00.000Z') al formato DATETIME de MySQL en
// UTC ('2026-09-01 20:30:00'). El frontend ya manda la hora convertida a UTC.
function isoToMysqlUtc(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

class LanzamientoController {
  // ── ADMIN ───────────────────────────────────────────────────────────────
  async listar(req, res) {
    try {
      const lanzamientos = await LanzamientoRepository.findAll();
      res.status(200).json(lanzamientos);
    } catch (error) {
      console.error('Error al listar lanzamientos:', error);
      res.status(500).json({ error: 'Error al obtener los lanzamientos' });
    }
  }

  async crear(req, res) {
    try {
      const { nombre_lanzamiento, nombre_producto, precio, fecha_lanzamiento, activo_en_home } = req.body;
      Lanzamiento.validate({ nombre_lanzamiento, nombre_producto, precio, fecha_lanzamiento }, { requiereFuturo: true });

      const archivos = req.files || [];
      if (archivos.length === 0) {
        return res.status(400).json({ error: 'Selecciona al menos una imagen para el lanzamiento.' });
      }

      const imagenes = [];
      for (const file of archivos) {
        const subida = await imageStorageService.uploadImage(file);
        imagenes.push({ url: subida.url, publicId: subida.publicId });
      }

      const fechaUtc = isoToMysqlUtc(fecha_lanzamiento);
      const lanzamiento = await LanzamientoRepository.create({
        nombre_lanzamiento: nombre_lanzamiento.trim(),
        nombre_producto: nombre_producto.trim(),
        precio,
        imagenes,
        fecha_lanzamiento: fechaUtc,
        activo_en_home: activo_en_home === 'true' || activo_en_home === true
      });

      res.status(201).json(lanzamiento);
    } catch (error) {
      console.error('Error al crear lanzamiento:', error);
      res.status(400).json({ error: error.message || 'Error al crear el lanzamiento' });
    }
  }

  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { nombre_lanzamiento, nombre_producto, precio, fecha_lanzamiento, imagenes_conservar } = req.body;

      const existente = await LanzamientoRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Lanzamiento no encontrado' });
      }
      if (existente.estado !== 'programado') {
        return res.status(409).json({ error: 'Este lanzamiento ya se lanzó y no se puede editar.' });
      }

      Lanzamiento.validate({ nombre_lanzamiento, nombre_producto, precio, fecha_lanzamiento });

      // Galería: se conservan las URLs que manda el formulario y se suben los
      // archivos nuevos; el resto de imágenes previas se borran de Cloudinary.
      let urlsAConservar = existente.imagenes.map((img) => img.url);
      if (imagenes_conservar !== undefined) {
        try {
          urlsAConservar = JSON.parse(imagenes_conservar);
        } catch {
          return res.status(400).json({ error: 'Formato inválido de imágenes a conservar' });
        }
      }

      const conservadas = existente.imagenes.filter((img) => urlsAConservar.includes(img.url));
      const borradas = existente.imagenes.filter((img) => !urlsAConservar.includes(img.url));
      borradas.forEach((img) => {
        if (img.publicId) imageStorageService.deleteImage(img.publicId);
      });

      const nuevas = [];
      for (const file of req.files || []) {
        const subida = await imageStorageService.uploadImage(file);
        nuevas.push({ url: subida.url, publicId: subida.publicId });
      }

      const imagenesFinales = [...conservadas, ...nuevas];
      if (imagenesFinales.length === 0) {
        return res.status(400).json({ error: 'El lanzamiento debe tener al menos una imagen.' });
      }

      const lanzamiento = await LanzamientoRepository.update(id, {
        nombre_lanzamiento: nombre_lanzamiento.trim(),
        nombre_producto: nombre_producto.trim(),
        precio,
        imagenes: imagenesFinales,
        fecha_lanzamiento: isoToMysqlUtc(fecha_lanzamiento)
      });

      res.status(200).json(lanzamiento);
    } catch (error) {
      console.error('Error al actualizar lanzamiento:', error);
      res.status(400).json({ error: error.message || 'Error al actualizar el lanzamiento' });
    }
  }

  async cambiarActivo(req, res) {
    try {
      const { id } = req.params;
      const { activo } = req.body;

      const existente = await LanzamientoRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Lanzamiento no encontrado' });
      }

      const lanzamiento = await LanzamientoRepository.setActivoHome(id, activo === true || activo === 'true');
      res.status(200).json(lanzamiento);
    } catch (error) {
      console.error('Error al cambiar el estado "activo en home" del lanzamiento:', error);
      res.status(500).json({ error: 'Error al actualizar el lanzamiento' });
    }
  }

  async eliminar(req, res) {
    try {
      const { id } = req.params;
      const existente = await LanzamientoRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Lanzamiento no encontrado' });
      }

      // Si ya se lanzó, las imágenes las está usando el producto real del
      // catálogo: no se tocan. Solo se limpian si el lanzamiento seguía en borrador.
      if (existente.estado === 'programado') {
        existente.imagenes.forEach((img) => {
          if (img.publicId) imageStorageService.deleteImage(img.publicId);
        });
      }

      // lanzamiento_inscritos se borra solo (ON DELETE CASCADE).
      await LanzamientoRepository.delete(id);
      res.status(200).json({ message: 'Lanzamiento eliminado' });
    } catch (error) {
      console.error('Error al eliminar lanzamiento:', error);
      res.status(500).json({ error: 'Error al eliminar el lanzamiento' });
    }
  }

  // ── PÚBLICO ─────────────────────────────────────────────────────────────
  // El Home pide esto al cargar. Antes de responder, se procesan los
  // lanzamientos vencidos (chequeo perezoso, además del scheduler interno).
  async home(req, res) {
    try {
      await LanzamientoService.procesarVencidos();
      const lanzamiento = await LanzamientoRepository.findActivoHome();
      res.status(200).json({
        lanzamiento,
        server_now: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error al obtener el lanzamiento del home:', error);
      res.status(500).json({ error: 'Error al obtener el lanzamiento' });
    }
  }

  async inscribir(req, res) {
    try {
      const { id } = req.params;
      const nombre = String(req.body.nombre || '').trim();
      const apellido = String(req.body.apellido || '').trim();
      const correo = String(req.body.correo || '').trim().toLowerCase();
      const telefono = String(req.body.telefono || '').trim();

      if (!nombre || !apellido || !correo || !telefono) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
      }
      if (!EMAIL_RE.test(correo)) {
        return res.status(400).json({ error: 'El correo no es válido.' });
      }
      if (!TELEFONO_RE.test(telefono)) {
        return res.status(400).json({ error: 'El número de teléfono no es válido.' });
      }

      const lanzamiento = await LanzamientoRepository.findById(id);
      if (!lanzamiento) {
        return res.status(404).json({ error: 'Lanzamiento no encontrado' });
      }
      if (lanzamiento.estado !== 'programado') {
        return res.status(409).json({ error: 'Este lanzamiento ya está disponible en la tienda.' });
      }

      await LanzamientoInscritoRepository.create(id, { nombre, apellido, correo, telefono });
      res.status(201).json({ message: 'Inscripción registrada' });
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Ya estás inscrito en este lanzamiento.' });
      }
      console.error('Error al registrar la inscripción al lanzamiento:', error);
      res.status(500).json({ error: 'Error al registrar la inscripción' });
    }
  }
}

module.exports = new LanzamientoController();
