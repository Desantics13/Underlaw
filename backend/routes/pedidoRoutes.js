const express = require('express');
const router = express.Router();
const PedidoController = require('../controllers/PedidoController');
const { requireAdminAuth } = require('../middleware/adminAuth');

// GET /api/pedidos -> Lista todos los pedidos (para el Dashboard). Protegida:
// expone datos personales de clientes.
router.get('/', requireAdminAuth, PedidoController.listarPedidos.bind(PedidoController));

module.exports = router;
