const SeccionRepository = require('../repositories/SeccionRepository');
const Seccion = require('../models/Seccion');

class SeccionController {
  // GET /api/secciones -> público, lo usa /products para las pestañas
  async listar(req, res) {
    try {
      const secciones = await SeccionRepository.findAll();
      res.status(200).json(secciones);
    } catch (error) {
      console.error('Error al listar secciones:', error);
      res.status(500).json({ error: 'Error al obtener las secciones' });
    }
  }

  async crear(req, res) {
    try {
      const { nombre, orden } = req.body;
      Seccion.validate({ nombre });
      const seccion = await SeccionRepository.create({ nombre: String(nombre).trim(), orden });
      res.status(201).json(seccion);
    } catch (error) {
      console.error('Error al crear sección:', error);
      res.status(400).json({ error: error.message || 'Error al crear la sección' });
    }
  }

  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { nombre, orden } = req.body;
      Seccion.validate({ nombre });

      const existente = await SeccionRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Sección no encontrada' });
      }

      const seccion = await SeccionRepository.update(id, { nombre: String(nombre).trim(), orden });
      res.status(200).json(seccion);
    } catch (error) {
      console.error('Error al actualizar sección:', error);
      res.status(400).json({ error: error.message || 'Error al actualizar la sección' });
    }
  }

  async eliminar(req, res) {
    try {
      const { id } = req.params;
      const existente = await SeccionRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Sección no encontrada' });
      }
      await SeccionRepository.delete(id);
      res.status(200).json({ message: 'Sección eliminada' });
    } catch (error) {
      console.error('Error al eliminar sección:', error);
      res.status(500).json({ error: 'Error al eliminar la sección' });
    }
  }
}

module.exports = new SeccionController();
