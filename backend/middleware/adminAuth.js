const jwt = require('jsonwebtoken');

// Exige "Authorization: Bearer <token>" válido, firmado con ADMIN_JWT_SECRET.
// Se usa en todas las rutas del panel Admin (ver server.js y cada *Routes.js).
function requireAdminAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}

module.exports = { requireAdminAuth };
