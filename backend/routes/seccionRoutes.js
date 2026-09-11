const express = require('express');
const router = express.Router();
const SeccionController = require('../controllers/SeccionController');
const { requireAdminAuth } = require('../middleware/adminAuth');

// GET /api/secciones -> público (pestañas en /products)
router.get('/', SeccionController.listar.bind(SeccionController));

// POST, PUT y DELETE -> solo Admin
router.post('/', requireAdminAuth, SeccionController.crear.bind(SeccionController));
router.put('/:id', requireAdminAuth, SeccionController.actualizar.bind(SeccionController));
router.delete('/:id', requireAdminAuth, SeccionController.eliminar.bind(SeccionController));

module.exports = router;
