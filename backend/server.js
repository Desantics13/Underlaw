require('./instrument');
const Sentry = require('@sentry/node');
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Algunos hosts (Railway incluido) no tienen salida IPv6 funcional aunque el
// DNS resuelva IPs v6 para dominios como smtp.gmail.com, lo que rompe
// conexiones salientes con ENETUNREACH. Preferir IPv4 evita ese problema
// para cualquier conexión saliente del servidor (correo, APIs externas, etc).
dns.setDefaultResultOrder('ipv4first');

const pedidoRoutes = require('./routes/pedidoRoutes');
const wompiRoutes = require('./routes/wompiRoutes');
const catalogoRoutes = require('./routes/catalogoRoutes');
const notificacionRoutes = require('./routes/notificacionRoutes');
const lanzamientoRoutes = require('./routes/lanzamientoRoutes');
const seccionRoutes = require('./routes/seccionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const inventarioRoutes = require('./routes/inventarioRoutes');
const LanzamientoService = require('./services/LanzamientoService');

const app = express();

// Orígenes permitidos a mandar credenciales/headers propios (como Authorization
// del panel Admin). FRONTEND_URL cubre el dominio real de producción configurado
// en Railway; el resto son los dominios conocidos del sitio y el entorno local.
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://underlaw.site',
  'https://www.underlaw.site',
  'http://localhost:5173',
  'http://localhost:3000',
  // TEMPORAL: IP de red local para probar el cliente Flutter Web desde el
  // celular (mismo Wi-Fi). Quitar cuando termine esa prueba.
  'http://192.168.0.8:3000'
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Sin "origin" (curl, Postman, el propio webhook de Wompi server-to-server)
    // se permite: no es un navegador el que necesita el header CORS.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Origen no permitido por CORS'));
  },
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Aumentar el límite de payload para aceptar el PDF en base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors(corsOptions));

// Sirve las imágenes de productos guardadas localmente (ver services/ImageStorageService.js)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas base
app.use('/api/admin', adminRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/wompi', wompiRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/lanzamientos', lanzamientoRoutes);
app.use('/api/secciones', seccionRoutes);
app.use('/api/inventario', inventarioRoutes);

// Reporta a Sentry cualquier error lanzado en las rutas anteriores; debe ir
// antes del manejador de errores global para no interceptar la respuesta.
Sentry.setupExpressErrorHandler(app);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo salió mal en el servidor!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});

// ─────────────────────────────────────────────────────────────────────────
// SCHEDULER DE LANZAMIENTOS (drops con cuenta regresiva)
//
// Revisa cada minuto si algún lanzamiento programado ya llegó a su fecha y, de
// ser así, crea el producto real en el catálogo y avisa a los inscritos. Es la
// fuente de verdad del "cronómetro" (el reloj del navegador no es confiable).
// El endpoint público GET /api/lanzamientos/home hace además este mismo chequeo
// de forma perezosa, así que el disparo no depende solo de este intervalo.
// Todo el proceso es idempotente (ver services/LanzamientoService.js).
// ─────────────────────────────────────────────────────────────────────────
const LANZAMIENTO_TICK_MS = 60 * 1000;
const dispararProcesoLanzamientos = () =>
  LanzamientoService.procesarVencidos().catch((err) => {
    console.error('Scheduler de lanzamientos:', err);
    Sentry.captureException(err);
  });
setTimeout(dispararProcesoLanzamientos, 5000);
setInterval(dispararProcesoLanzamientos, LANZAMIENTO_TICK_MS);
