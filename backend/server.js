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
const LanzamientoService = require('./services/LanzamientoService');

const app = express();

// Aumentar el límite de payload para aceptar el PDF en base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Sirve las imágenes de productos guardadas localmente (ver services/ImageStorageService.js)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rutas base
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/wompi', wompiRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/notificaciones', notificacionRoutes);
app.use('/api/lanzamientos', lanzamientoRoutes);

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
  LanzamientoService.procesarVencidos().catch((err) =>
    console.error('Scheduler de lanzamientos:', err)
  );
setTimeout(dispararProcesoLanzamientos, 5000);
setInterval(dispararProcesoLanzamientos, LANZAMIENTO_TICK_MS);
