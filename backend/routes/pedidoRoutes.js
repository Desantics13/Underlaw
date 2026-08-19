const express = require('express');
const router = express.Router();
const PedidoController = require('../controllers/PedidoController');

// POST /api/pedidos -> Crea un nuevo pedido, guarda en BD y envía correo
router.post('/', PedidoController.crearPedido.bind(PedidoController));

// GET /api/pedidos -> Lista todos los pedidos (para el Dashboard)
router.get('/', PedidoController.listarPedidos.bind(PedidoController));

module.exports = router;
