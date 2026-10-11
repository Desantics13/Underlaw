const express = require('express');
const router = express.Router();
const SitioController = require('../controllers/SitioController');
const { upload } = require('../services/ImageStorageService');
const { requireAdminAuth } = require('../middleware/adminAuth');

// Igual que en lanzamientoRoutes: responde en JSON si multer rechaza el
// archivo (tipo/tamaño), en vez de dejarlo caer en el manejador genérico.
const handleUpload = (req, res, next) => {
  upload.single('imagen')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir la imagen' });
    }
    next();
  });
};

// ── Público (Home y Racing) ──
// GET /api/sitio -> { imagenes: { <zona>: [...] }, videos: [...] }
router.get('/', SitioController.obtener.bind(SitioController));

// ── Admin (protegidas) ──
router.post('/imagenes', requireAdminAuth, handleUpload, SitioController.crearImagen.bind(SitioController));
router.put('/imagenes/:id', requireAdminAuth, handleUpload, SitioController.actualizarImagen.bind(SitioController));
router.delete('/imagenes/:id', requireAdminAuth, SitioController.eliminarImagen.bind(SitioController));

router.post('/videos', requireAdminAuth, SitioController.crearVideo.bind(SitioController));
router.put('/videos/:id', requireAdminAuth, SitioController.actualizarVideo.bind(SitioController));
router.delete('/videos/:id', requireAdminAuth, SitioController.eliminarVideo.bind(SitioController));

module.exports = router;
