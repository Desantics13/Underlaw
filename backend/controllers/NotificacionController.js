const NotificacionRepository = require('../repositories/NotificacionRepository');

class NotificacionController {
  async listar(req, res) {
    try {
      const notificaciones = await NotificacionRepository.findAll();
      res.status(200).json(notificaciones);
    } catch (error) {
      console.error('Error al listar notificaciones:', error);
      res.status(500).json({ error: 'Error al obtener las notificaciones' });
    }
  }

  async marcarLeidas(req, res) {
    try {
      await NotificacionRepository.marcarTodasLeidas();
      res.status(200).json({ message: 'Notificaciones marcadas como leídas' });
    } catch (error) {
      console.error('Error al marcar notificaciones como leídas:', error);
      res.status(500).json({ error: 'Error al marcar las notificaciones como leídas' });
    }
  }

  async borrarTodas(req, res) {
    try {
      await NotificacionRepository.borrarTodas();
      res.status(200).json({ message: 'Notificaciones eliminadas' });
    } catch (error) {
      console.error('Error al borrar notificaciones:', error);
      res.status(500).json({ error: 'Error al borrar las notificaciones' });
    }
  }
}

module.exports = new NotificacionController();
