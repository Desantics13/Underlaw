// Debe importarse antes que cualquier otro módulo (server.js lo hace primero)
// para que Sentry pueda instrumentar automáticamente express, mysql2, http, etc.
const Sentry = require('@sentry/node');
require('dotenv').config();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    sendDefaultPii: false,
  });
}
