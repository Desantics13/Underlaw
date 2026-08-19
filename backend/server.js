const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pedidoRoutes = require('./routes/pedidoRoutes');
const wompiRoutes = require('./routes/wompiRoutes');

const app = express();

// Aumentar el límite de payload para aceptar el PDF en base64
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Rutas base
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/wompi', wompiRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo salió mal en el servidor!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Servidor Backend corriendo en http://localhost:${PORT}`);
});
