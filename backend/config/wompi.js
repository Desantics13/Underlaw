require('dotenv').config();

const publicKey = process.env.WOMPI_PUBLIC_KEY;

module.exports = {
  publicKey,
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET,
  eventsSecret: process.env.WOMPI_EVENTS_SECRET,
  currency: 'COP',
  // La API de Wompi es distinta para llaves de pruebas vs. producción
  apiBaseUrl: publicKey && publicKey.startsWith('pub_test_')
    ? 'https://sandbox.wompi.co/v1'
    : 'https://production.wompi.co/v1'
};
