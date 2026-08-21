const express = require('express');
const router = express.Router();
const NotificacionController = require('../controllers/NotificacionController');

// GET /api/notificaciones -> Lista las últimas notificaciones (para la campanita del Admin)
router.get('/', NotificacionController.listar.bind(NotificacionController));

// PATCH /api/notificaciones/marcar-leidas -> Marca todas como leídas
router.patch('/marcar-leidas', NotificacionController.marcarLeidas.bind(NotificacionController));

// DELETE /api/notificaciones -> Borra todas las notificaciones
router.delete('/', NotificacionController.borrarTodas.bind(NotificacionController));

module.exports = router;
