const CatalogoProductoRepository = require('../repositories/CatalogoProductoRepository');
const CatalogoProductoImagenRepository = require('../repositories/CatalogoProductoImagenRepository');
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

      const archivos = req.files || [];
      const subidas = [];
      for (const file of archivos) {
        subidas.push(await imageStorageService.uploadImage(file));
      }

      // "imagen"/"imagen_public_id" en catalogo_productos se mantienen como la
      // portada (primera imagen subida) por compatibilidad con lo que ya las use;
      // el arreglo completo para el carrusel vive en catalogo_producto_imagenes.
      const imagen = subidas.length > 0 ? subidas[0].url : null;
      const imagen_public_id = subidas.length > 0 ? subidas[0].publicId : null;

      const producto = await CatalogoProductoRepository.create({ nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id });

      if (subidas.length > 0) {
        await CatalogoProductoImagenRepository.insertMany(producto.id, subidas.map((s) => ({ url: s.url, publicId: s.publicId })));
      }

      const productoConImagenes = await CatalogoProductoRepository.findById(producto.id);
      res.status(201).json(productoConImagenes);
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(400).json({ error: error.message || 'Error al crear el producto' });
    }
  }

  async actualizar(req, res) {
    try {
      const { id } = req.params;
      const { nombre_lanzamiento, nombre_producto, precio, imagenes_conservar } = req.body;
      Producto.validate({ nombre_lanzamiento, nombre_producto, precio });

      const existente = await CatalogoProductoRepository.findById(id);
      if (!existente) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const archivos = req.files || [];
      let imagen = null;
      let imagen_public_id = null;

      if (imagenes_conservar !== undefined) {
        // El formulario de Admin gestiona la galería completa: manda qué imágenes ya
        // existentes conservar (el resto se borran) más los archivos nuevos a agregar.
        let urlsAConservar;
        try {
          urlsAConservar = JSON.parse(imagenes_conservar);
        } catch (parseError) {
          return res.status(400).json({ error: 'Formato inválido de imágenes a conservar' });
        }

        const galeriaActual = await CatalogoProductoImagenRepository.findByProductoId(id);
        const aConservar = galeriaActual.filter((img) => urlsAConservar.includes(img.imagen));
        const aBorrar = galeriaActual.filter((img) => !urlsAConservar.includes(img.imagen));
        aBorrar.forEach((img) => {
          if (img.imagen_public_id) imageStorageService.deleteImage(img.imagen_public_id);
        });

        const subidas = [];
        for (const file of archivos) {
          subidas.push(await imageStorageService.uploadImage(file));
        }

        const galeriaFinal = [
          ...aConservar.map((img) => ({ url: img.imagen, publicId: img.imagen_public_id })),
          ...subidas.map((s) => ({ url: s.url, publicId: s.publicId }))
        ];

        if (galeriaFinal.length === 0) {
          return res.status(400).json({ error: 'El producto debe tener al menos una imagen.' });
        }

        await CatalogoProductoImagenRepository.deleteByProductoId(id);
        await CatalogoProductoImagenRepository.insertMany(id, galeriaFinal);

        imagen = galeriaFinal[0].url;
        imagen_public_id = galeriaFinal[0].publicId;
      } else if (archivos.length > 0) {
        // Compatibilidad hacia atrás: si no viene "imagenes_conservar" pero sí llegan
        // archivos, se reemplaza toda la galería anterior por la nueva.
        const subidas = [];
        for (const file of archivos) {
          subidas.push(await imageStorageService.uploadImage(file));
        }
        imagen = subidas[0].url;
        imagen_public_id = subidas[0].publicId;

        const imagenesAnteriores = await CatalogoProductoImagenRepository.findByProductoId(id);
        imagenesAnteriores.forEach((img) => {
          if (img.imagen_public_id) imageStorageService.deleteImage(img.imagen_public_id);
        });
        if (existente.imagen_public_id) {
          imageStorageService.deleteImage(existente.imagen_public_id);
        }
        await CatalogoProductoImagenRepository.deleteByProductoId(id);
        await CatalogoProductoImagenRepository.insertMany(id, subidas.map((s) => ({ url: s.url, publicId: s.publicId })));
      }

      await CatalogoProductoRepository.update(id, { nombre_lanzamiento, nombre_producto, precio, imagen, imagen_public_id });
      const producto = await CatalogoProductoRepository.findById(id);
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

      const imagenes = await CatalogoProductoImagenRepository.findByProductoId(id);
      imagenes.forEach((img) => {
        if (img.imagen_public_id) imageStorageService.deleteImage(img.imagen_public_id);
      });
      if (existente.imagen_public_id) {
        imageStorageService.deleteImage(existente.imagen_public_id);
      }

      // Las filas de catalogo_producto_imagenes se borran solas (ON DELETE CASCADE)
      await CatalogoProductoRepository.delete(id);
      res.status(200).json({ message: 'Producto eliminado' });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({ error: 'Error al eliminar el producto' });
    }
  }
}

module.exports = new CatalogoProductoController();
