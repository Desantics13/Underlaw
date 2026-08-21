const CatalogoProductoRepository = require('../repositories/CatalogoProductoRepository');
const Producto = require('../models/Producto');
const { imageStorageService } = require('../services/ImageStorageService');

class CatalogoProductoController {
  async listar(req, res) {
    try {
      const productos = await CatalogoProductoRepository.findAll();
      res.status(200).json(productos);
    } catch (error) {
      console.error('Error al listar productos del catálogo:', error);
      res.status(500).json({ error: 'Error al obtener los productos' });
    }
  }

  async crear(req, res) {
    try {
      const { nombre_lanzamiento, nombre_producto, precio } = req.body;
      Producto.validate({ nombre_lanzamiento, nombre_producto, precio });

      let imagen = null;
      let imagen_public_id = null;
      if (req.file) {
        const subida = await imageStorageService.uploadImage(req.file);
        imagen = subida.url;
        imagen_public_id = subida.publicId;
      }

      const producto = await CatalogoProductoRepository.create({ nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id });

      res.status(201).json(producto);
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(400).json({ error: error.message || 'Error al crear el producto' });
    }
  }

  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { nombre_lanzamiento, nombre_producto, precio } = req.body;
      Producto.validate({ nombre_lanzamiento, nombre_producto, precio });

      const existente = await CatalogoProductoRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      let imagen = null;
      let imagen_public_id = null;
      if (req.file) {
        const subida = await imageStorageService.uploadImage(req.file);
        imagen = subida.url;
        imagen_public_id = subida.publicId;
        // Borra la imagen anterior para no dejar archivos huérfanos en Cloudinary
        if (existente.imagen_public_id) {
          imageStorageService.deleteImage(existente.imagen_public_id);
        }
      }

      const producto = await CatalogoProductoRepository.update(id, { nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id });
      res.status(200).json(producto);
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(400).json({ error: error.message || 'Error al actualizar el producto' });
    }
  }

  async cambiarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      if (!['activo', 'suspendido'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const existente = await CatalogoProductoRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const producto = await CatalogoProductoRepository.updateEstado(id, estado);
      res.status(200).json(producto);
    } catch (error) {
      console.error('Error al cambiar estado del producto:', error);
      res.status(500).json({ error: 'Error al cambiar el estado del producto' });
    }
  }

  async eliminar(req, res) {
    try {
      const { id } = req.params;
      const existente = await CatalogoProductoRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      if (existente.imagen_public_id) {
        imageStorageService.deleteImage(existente.imagen_public_id);
      }

      await CatalogoProductoRepository.delete(id);
      res.status(200).json({ message: 'Producto eliminado' });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({ error: 'Error al eliminar el producto' });
    }
  }
}

module.exports = new CatalogoProductoController();
