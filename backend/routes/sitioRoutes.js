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
// Toda escritura (ya autenticada) borra la caché pública al empezar y al
// terminar, haya salido bien o mal, así el sitio refleja el cambio en la
// siguiente visita.
const invalidaCache = (req, res, next) => {
  SitioController.invalidarCache();
  res.on('finish', () => SitioController.invalidarCache());
  next();
};

router.post('/imagenes', requireAdminAuth, invalidaCache, handleUpload, SitioController.crearImagen.bind(SitioController));
router.put('/imagenes/:id', requireAdminAuth, invalidaCache, handleUpload, SitioController.actualizarImagen.bind(SitioController));
router.delete('/imagenes/:id', requireAdminAuth, invalidaCache, SitioController.eliminarImagen.bind(SitioController));

router.post('/videos', requireAdminAuth, invalidaCache, SitioController.crearVideo.bind(SitioController));
router.put('/videos/:id', requireAdminAuth, invalidaCache, SitioController.actualizarVideo.bind(SitioController));
router.delete('/videos/:id', requireAdminAuth, invalidaCache, SitioController.eliminarVideo.bind(SitioController));

module.exports = router;
