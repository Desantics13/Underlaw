require('dotenv').config();

module.exports = {
  publicKey: process.env.WOMPI_PUBLIC_KEY,
  integritySecret: process.env.WOMPI_INTEGRITY_SECRET,
  eventsSecret: process.env.WOMPI_EVENTS_SECRET,
  currency: 'COP'
};
