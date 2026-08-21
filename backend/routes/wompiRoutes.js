const express = require('express');
const router = express.Router();
const WompiController = require('../controllers/WompiController');

// POST /api/wompi/iniciar -> Crea el pedido PENDING y devuelve la firma para abrir el Widget
router.post('/iniciar', WompiController.iniciarPago.bind(WompiController));

// POST /api/wompi/confirmar -> El frontend confirma tras un resultado aprobado del Widget
router.post('/confirmar', WompiController.confirmarPago.bind(WompiController));

// POST /api/wompi/cancelar -> El frontend avisa que el pago fue rechazado/cerrado
router.post('/cancelar', WompiController.cancelarPago.bind(WompiController));

// GET /api/wompi/estado/:reference -> Consulta el estado real de un pedido (para el retorno de Nequi/PSE)
router.get('/estado/:reference', WompiController.consultarEstado.bind(WompiController));

// POST /api/wompi/webhook -> Notificación asíncrona oficial de Wompi (transaction.updated)
router.post('/webhook', WompiController.webhook.bind(WompiController));

module.exports = router;
