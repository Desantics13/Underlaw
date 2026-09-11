const CatalogoProductoRepository = require('../repositories/CatalogoProductoRepository');
const LanzamientoRepository = require('../repositories/LanzamientoRepository');
const Producto = require('../models/Producto');

class InventarioController {
  // GET /api/inventario -> productos del catálogo (todos) + próximos
  // lanzamientos ("programado"), con sus tallas y cantidades reales.
  async listar(req, res) {
    try {
      const [productos, lanzamientos] = await Promise.all([
        CatalogoProductoRepository.findAll(),
        LanzamientoRepository.findAll()
      ]);

      res.status(200).json({
        productos,
        lanzamientos: lanzamientos.filter((l) => l.estado === 'programado')
      });
    } catch (error) {
      console.error('Error al listar el inventario:', error);
      res.status(500).json({ error: 'Error al obtener el inventario' });
    }
  }

  // PUT /api/inventario/:id?tipo=producto|lanzamiento -> actualiza solo las
  // tallas/cantidades de ese producto o lanzamiento.
  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const tipo = req.query.tipo === 'lanzamiento' ? 'lanzamiento' : 'producto';
      const tallas = Producto.parseTallas(req.body.tallas);

      if (!tallas) {
        return res.status(400).json({ error: 'Faltan las tallas a actualizar.' });
      }

      const repo = tipo === 'lanzamiento' ? LanzamientoRepository : CatalogoProductoRepository;
      const existente = await repo.findById(id);
      if (!existente) {
        return res.status(404).json({ error: tipo === 'lanzamiento' ? 'Lanzamiento no encontrado' : 'Producto no encontrado' });
      }

      const actualizado = await repo.updateTallas(id, tallas);
      res.status(200).json(actualizado);
    } catch (error) {
      console.error('Error al actualizar el inventario:', error);
      res.status(400).json({ error: error.message || 'Error al actualizar el inventario' });
    }
  }
}

module.exports = new InventarioController();
