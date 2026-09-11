const express = require('express');
const router = express.Router();
const InventarioController = require('../controllers/InventarioController');
const { requireAdminAuth } = require('../middleware/adminAuth');

// Todo el inventario es exclusivo del Admin: expone cantidades reales en stock.
router.get('/', requireAdminAuth, InventarioController.listar.bind(InventarioController));
router.put('/:id', requireAdminAuth, InventarioController.actualizar.bind(InventarioController));

module.exports = router;
