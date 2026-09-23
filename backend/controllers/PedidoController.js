const PedidoRepository = require('../repositories/PedidoRepository');

class PedidoController {
  // Método opcional para listar pedidos (para el Dashboard)
  async listarPedidos(req, res) {
    try {
      const pedidos = await PedidoRepository.findAll();
      res.status(200).json(pedidos);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener pedidos' });
    }
  }
}

module.exports = new PedidoController();
