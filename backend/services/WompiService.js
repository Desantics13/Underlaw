const crypto = require('crypto');
const wompiConfig = require('../config/wompi');

class WompiService {
  // Genera la firma de integridad que Wompi exige para abrir el Widget de forma segura.
  // Referencia: https://docs.wompi.co/docs/colombia/widget-checkout-web/#firma-de-integridad
  generateIntegritySignature(reference, amountInCents, currency = wompiConfig.currency) {
    const raw = `${reference}${amountInCents}${currency}${wompiConfig.integritySecret}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  // Verifica el checksum del evento que Wompi envía al webhook.
  // Referencia: https://docs.wompi.co/docs/colombia/eventos/
  verifyEventChecksum(event) {
    const { properties, checksum } = event.signature || {};
    if (!properties || !checksum) return false;

    const concatenated = properties
      .map(path => path.split('.').reduce((obj, key) => obj?.[key], event.data))
      .join('');

    const raw = `${concatenated}${event.timestamp}${wompiConfig.eventsSecret}`;
    const computed = crypto.createHash('sha256').update(raw).digest('hex');

    return computed.toUpperCase() === checksum.toUpperCase();
  }

  buildReference(pedidoId) {
    return `UL-${pedidoId}-${Date.now()}`;
  }

  // Consulta el estado real de una transacción directo en la API de Wompi.
  // Se usa cuando el cliente vuelve de un pago que lo sacó de la página
  // (Nequi, PSE) para saber el resultado al instante, sin esperar a que
  // llegue el webhook asíncrono. Es un endpoint público de Wompi (no
  // requiere autenticación, el id de transacción ya es suficientemente
  // difícil de adivinar).
  async consultarTransaccion(transactionId) {
    const res = await fetch(`${wompiConfig.apiBaseUrl}/transactions/${transactionId}`);
    if (!res.ok) {
      throw new Error(`Wompi respondió ${res.status} al consultar la transacción`);
    }
    const body = await res.json();
    return body.data; // { id, status, reference, ... }
  }
}

module.exports = new WompiService();
