const express = require('express');
const router = express.Router();
const LanzamientoController = require('../controllers/LanzamientoController');
const { upload } = require('../services/ImageStorageService');

// Igual que en catalogoRoutes: responde en JSON si multer rechaza una imagen
// (tipo/tamaño), en vez de dejarlo caer en el manejador de errores genérico.
const handleUpload = (req, res, next) => {
  upload.array('imagenes', 8)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir las imágenes' });
    }
    next();
  });
};

// ── Público (Home) ──
// GET /api/lanzamientos/home -> lanzamiento activo + hora del servidor
router.get('/home', LanzamientoController.home.bind(LanzamientoController));
// POST /api/lanzamientos/:id/inscritos -> inscribe un correo al lanzamiento
router.post('/:id/inscritos', LanzamientoController.inscribir.bind(LanzamientoController));

// ── Admin ──
// GET /api/lanzamientos -> lista todos los lanzamientos
router.get('/', LanzamientoController.listar.bind(LanzamientoController));
// POST /api/lanzamientos -> crea un lanzamiento (multipart, campo "imagenes", hasta 8)
router.post('/', handleUpload, LanzamientoController.crear.bind(LanzamientoController));
// PUT /api/lanzamientos/:id -> edita un lanzamiento que sigue "programado"
router.put('/:id', handleUpload, LanzamientoController.actualizar.bind(LanzamientoController));
// PATCH /api/lanzamientos/:id/activo -> activa/desactiva la muestra en el Home
router.patch('/:id/activo', LanzamientoController.cambiarActivo.bind(LanzamientoController));
// DELETE /api/lanzamientos/:id -> elimina un lanzamiento
router.delete('/:id', LanzamientoController.eliminar.bind(LanzamientoController));

module.exports = router;
