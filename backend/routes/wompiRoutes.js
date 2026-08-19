const express = require('express');
const router = express.Router();
const WompiController = require('../controllers/WompiController');

// POST /api/wompi/iniciar -> Crea el pedido PENDING y devuelve la firma para abrir el Widget
router.post('/iniciar', WompiController.iniciarPago.bind(WompiController));

// POST /api/wompi/confirmar -> El frontend confirma tras un resultado aprobado del Widget
router.post('/confirmar', WompiController.confirmarPago.bind(WompiController));

// POST /api/wompi/webhook -> Notificación asíncrona oficial de Wompi (transaction.updated)
router.post('/webhook', WompiController.webhook.bind(WompiController));

module.exports = router;
