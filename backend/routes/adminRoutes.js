const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const AdminController = require('../controllers/AdminController');

// 5 intentos fallidos por IP cada 5 minutos. Los intentos exitosos no cuentan
// (skipSuccessfulRequests), así que un admin que ya acertó no queda bloqueado.
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos fallidos. Intenta de nuevo en unos minutos.' }
});

// POST /api/admin/login -> { password } -> { token }
router.post('/login', loginLimiter, AdminController.login.bind(AdminController));

module.exports = router;
