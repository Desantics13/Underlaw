const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Comparación a tiempo constante para no filtrar por timing cuánto de la
// contraseña coincidió. Ambos buffers deben tener el mismo largo para
// timingSafeEqual, así que si difieren ya sabemos que no coincide.
function passwordsMatch(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

class AdminController {
  async login(req, res) {
    try {
      const { password } = req.body;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminPassword) {
        console.error('ADMIN_PASSWORD no está configurada en el servidor.');
        return res.status(500).json({ error: 'El servidor no tiene configurado el acceso de administrador.' });
      }

      if (!password || !passwordsMatch(password, adminPassword)) {
        return res.status(401).json({ error: 'Contraseña incorrecta.' });
      }

      const token = jwt.sign({ role: 'admin' }, process.env.ADMIN_JWT_SECRET, { expiresIn: '8h' });
      res.status(200).json({ token });
    } catch (error) {
      console.error('Error en el login del admin:', error);
      res.status(500).json({ error: 'Error interno al iniciar sesión' });
    }
  }
}

module.exports = new AdminController();
