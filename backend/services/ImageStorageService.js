const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// ─────────────────────────────────────────────────────────────────────────
// ALMACENAMIENTO DE IMÁGENES — Cloudinary
//
// Las imágenes de productos se suben a Cloudinary en vez de guardarse en el
// disco del servidor. Es necesario porque el disco de Railway (y de la
// mayoría de plataformas tipo PaaS) NO es persistente: se borra en cada
// redeploy. Toda la lógica de "dónde y cómo se guarda una imagen" vive
// únicamente en este archivo — controllers y rutas solo conocen
// uploadImage()/deleteImage(), así que si el día de mañana se cambia de
// proveedor de almacenamiento, solo hay que reescribir este módulo.
// ─────────────────────────────────────────────────────────────────────────

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const CLOUDINARY_FOLDER = 'under-law/productos';

// Multer guarda el archivo temporalmente en memoria (no en disco) antes de subirlo
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const permitidos = ['image/jpeg', 'image/jpg', 'image/png'];
  if (permitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG o PNG'));
  }
};

// Middleware de Express listo para usar en las rutas, ej: upload.single('imagen')
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

class ImageStorageService {
  // Sube el buffer que dejó multer en req.file a Cloudinary.
  // Devuelve { url, publicId }: "url" se guarda en la columna "imagen" (se usa
  // directo en el <img src>), "publicId" se guarda aparte para poder borrarla después.
  async uploadImage(file) {
    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await cloudinary.uploader.upload(base64, { folder: CLOUDINARY_FOLDER });
    return { url: result.secure_url, publicId: result.public_id };
  }

  // Borra una imagen de Cloudinary a partir del public_id guardado en BD.
  // Se usa al eliminar un producto o al reemplazar su imagen en una edición.
  async deleteImage(publicId) {
    if (!publicId) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error al borrar la imagen en Cloudinary:', error);
    }
  }
}

module.exports = { upload, imageStorageService: new ImageStorageService() };
