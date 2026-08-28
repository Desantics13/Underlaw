const { join } = require('path');

// Descarga el Chromium de Puppeteer DENTRO de esta carpeta (backend/.cache),
// no en ~/.cache. En Railway (Railpack) el build y el runtime son capas
// distintas: si el navegador queda fuera del directorio de la app, el runtime
// no lo encuentra. Railpack ya instala solo las librerías de sistema que Chrome
// headless necesita al detectar "puppeteer" en package.json.
module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
