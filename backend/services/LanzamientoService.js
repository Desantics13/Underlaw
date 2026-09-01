const LanzamientoRepository = require('../repositories/LanzamientoRepository');
const LanzamientoInscritoRepository = require('../repositories/LanzamientoInscritoRepository');
const CatalogoProductoRepository = require('../repositories/CatalogoProductoRepository');
const CatalogoProductoImagenRepository = require('../repositories/CatalogoProductoImagenRepository');
const NotificacionRepository = require('../repositories/NotificacionRepository');
const EmailService = require('./EmailService');

// ─────────────────────────────────────────────────────────────────────────
// CUMPLIMIENTO DE LANZAMIENTOS (cuando el cronómetro llega a cero)
//
// La fuente de verdad de si un lanzamiento ya ocurrió es el SERVIDOR, nunca el
// reloj del navegador. Este servicio se dispara por dos vías:
//   1. Un scheduler interno (setInterval en server.js) cada minuto.
//   2. Un chequeo perezoso cada vez que el Home pide el lanzamiento activo.
//
// Ambas llaman procesarVencidos(). El paso crítico (crear el producto real y
// avisar a los inscritos) es IDEMPOTENTE:
//   - El producto se crea solo si el UPDATE condicional a estado='lanzado'
//     afecta 1 fila (marcarLanzado); si otra ejecución ya lo hizo, devuelve 0.
//   - Los correos se filtran por notificado_at IS NULL y se marcan uno por uno
//     tras enviarse, así un reintento no reenvía.
// ─────────────────────────────────────────────────────────────────────────

let enProceso = false;

class LanzamientoService {
  async procesarVencidos() {
    // Evita que el tick del scheduler y una request al Home se pisen dentro
    // del mismo proceso. La idempotencia a nivel BD cubre el caso multiproceso.
    if (enProceso) return;
    enProceso = true;
    try {
      const ids = await LanzamientoRepository.findVencidosProgramados();
      for (const id of ids) {
        try {
          await this.cumplirLanzamiento(id);
        } catch (error) {
          console.error(`Error al cumplir el lanzamiento ${id}:`, error);
        }
      }
    } finally {
      enProceso = false;
    }
  }

  async cumplirLanzamiento(id) {
    const afectadas = await LanzamientoRepository.marcarLanzado(id);
    if (afectadas === 0) return; // ya lo procesó otra ejecución

    const lanzamiento = await LanzamientoRepository.findById(id);
    const imagenes = lanzamiento.imagenes || [];

    // 1. Crear el producto real en el catálogo (queda 'activo' y comprable).
    const producto = await CatalogoProductoRepository.create({
      nombre_lanzamiento: lanzamiento.nombre_lanzamiento,
      nombre_producto: lanzamiento.nombre_producto,
      precio: lanzamiento.precio,
      imagen: imagenes[0] ? imagenes[0].url : null,
      imagen_public_id: imagenes[0] ? imagenes[0].publicId : null
    });

    if (imagenes.length > 0) {
      await CatalogoProductoImagenRepository.insertMany(
        producto.id,
        imagenes.map((img) => ({ url: img.url, publicId: img.publicId }))
      );
    }

    // 2. Enlazar el lanzamiento con su producto ya creado.
    await LanzamientoRepository.setProductoId(id, producto.id);

    // 3. Avisar al Admin por la campanita.
    try {
      await NotificacionRepository.create(
        `Lanzamiento "${lanzamiento.nombre_lanzamiento}" ya está disponible en la tienda`
      );
    } catch (error) {
      console.error('No se pudo crear la notificación del lanzamiento:', error);
    }

    // 4. Enviar el correo a los inscritos (idempotente por notificado_at).
    await this.notificarInscritos(lanzamiento, producto.id);
  }

  async notificarInscritos(lanzamiento, productoId) {
    const pendientes = await LanzamientoInscritoRepository.findPendientesNotificacion(lanzamiento.id);
    for (const inscrito of pendientes) {
      try {
        await EmailService.sendLaunchAvailableEmail(inscrito, lanzamiento, productoId);
        await LanzamientoInscritoRepository.marcarNotificado(inscrito.id);
      } catch (error) {
        // No se marca: se reintenta en el próximo tick del scheduler.
        console.error(
          `No se pudo enviar el correo de lanzamiento al inscrito ${inscrito.id} (${inscrito.correo}):`,
          error
        );
      }
    }
  }
}

module.exports = new LanzamientoService();
