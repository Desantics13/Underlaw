const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const WompiController = require('../controllers/WompiController');

// 10 intentos por IP cada 10 minutos. Cubre iniciar/confirmar: son los pasos
// del checkout que crean o mutan un pedido, los más golpeados en un abuso/bot.
const checkoutLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de pago. Intenta de nuevo en unos minutos.' }
});

// POST /api/wompi/iniciar -> Crea el pedido PENDING y devuelve la firma para abrir el Widget
router.post('/iniciar', checkoutLimiter, WompiController.iniciarPago.bind(WompiController));

// POST /api/wompi/confirmar -> El frontend confirma tras un resultado aprobado del Widget
router.post('/confirmar', checkoutLimiter, WompiController.confirmarPago.bind(WompiController));

// POST /api/wompi/cancelar -> El frontend avisa que el pago fue rechazado/cerrado
router.post('/cancelar', WompiController.cancelarPago.bind(WompiController));

// GET /api/wompi/estado/:reference -> Consulta el estado real de un pedido (para el retorno de Nequi/PSE)
router.get('/estado/:reference', WompiController.consultarEstado.bind(WompiController));

// POST /api/wompi/webhook -> Notificación asíncrona oficial de Wompi (transaction.updated)
router.post('/webhook', WompiController.webhook.bind(WompiController));

module.exports = router;
