const express = require('express');
const router = express.Router();
const NotificacionController = require('../controllers/NotificacionController');
const { requireAdminAuth } = require('../middleware/adminAuth');

// GET /api/notificaciones -> Lista las últimas notificaciones (para la campanita del Admin)
router.get('/', requireAdminAuth, NotificacionController.listar.bind(NotificacionController));

// PATCH /api/notificaciones/marcar-leidas -> Marca todas como leídas
router.patch('/marcar-leidas', requireAdminAuth, NotificacionController.marcarLeidas.bind(NotificacionController));

// DELETE /api/notificaciones -> Borra todas las notificaciones
router.delete('/', requireAdminAuth, NotificacionController.borrarTodas.bind(NotificacionController));

module.exports = router;
