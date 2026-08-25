const express = require('express');
const router = express.Router();
const CatalogoProductoController = require('../controllers/CatalogoProductoController');
const { upload } = require('../services/ImageStorageService');

// Envuelve multer para responder en JSON si alguna imagen no es válida (tipo/tamaño),
// en vez de dejar que caiga en el manejador de errores genérico (texto plano).
const handleUpload = (req, res, next) => {
  upload.array('imagenes', 8)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Error al subir las imágenes' });
    }
    next();
  });
};

// GET /api/catalogo -> Lista todos los productos (activos y suspendidos)
router.get('/', CatalogoProductoController.listar.bind(CatalogoProductoController));

// POST /api/catalogo -> Crea un producto nuevo (multipart/form-data, campo "imagenes", hasta 8)
router.post('/', handleUpload, CatalogoProductoController.crear.bind(CatalogoProductoController));

// PUT /api/catalogo/:id -> Edita un producto existente (imágenes opcionales; si llegan, reemplazan la galería completa)
router.put('/:id', handleUpload, CatalogoProductoController.actualizar.bind(CatalogoProductoController));

// PATCH /api/catalogo/:id/estado -> Suspende/activa un producto
router.patch('/:id/estado', CatalogoProductoController.cambiarEstado.bind(CatalogoProductoController));

// DELETE /api/catalogo/:id -> Elimina un producto por completo
router.delete('/:id', CatalogoProductoController.eliminar.bind(CatalogoProductoController));

module.exports = router;
