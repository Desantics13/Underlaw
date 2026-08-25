-- Script para crear la base de datos y la tabla de productos (compras) en MySQL Workbench

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS under_law_db;
USE under_law_db;


CREATE TABLE IF NOT EXISTS producto (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_cliente VARCHAR(100) NOT NULL,
    apellido_cliente VARCHAR(100) NOT NULL,
    correo_cliente VARCHAR(150) NOT NULL,
    telefono_cliente VARCHAR(20) NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    precio_producto DECIMAL(10, 2) NOT NULL,
    fecha_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ejemplo de inserción de un registro (Opcional)
-- INSERT INTO producto (nombre_cliente, apellido_cliente, correo_cliente, telefono_cliente, nombre_producto, precio_producto)
-- VALUES ('Juan', 'Pérez', 'juan.perez@example.com', '3001234567', 'Oversized Buddha Tee', 110000.00);

-- -------------------------------------------------------------------------
-- ACTUALIZACIÓN: Ejecutar este comando para añadir el método de pago
-- Si la tabla ya existe y necesitas la columna nueva, corre solo esta línea en tu Workbench:
-- -------------------------------------------------------------------------
ALTER TABLE producto ADD COLUMN metodo_pago VARCHAR(50) DEFAULT 'No especificado';

-- -------------------------------------------------------------------------
-- ACTUALIZACIÓN: Integración de pagos con Wompi (tarjeta y PSE)
-- Corre estas líneas en tu Workbench si la tabla ya existía:
-- -------------------------------------------------------------------------
ALTER TABLE producto ADD COLUMN referencia_pago VARCHAR(100) UNIQUE;
ALTER TABLE producto ADD COLUMN estado_pago VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE producto ADD COLUMN wompi_transaction_id VARCHAR(100);
ALTER TABLE producto ADD COLUMN email_enviado TINYINT(1) DEFAULT 0;

-- -------------------------------------------------------------------------
-- ACTUALIZACIÓN: Dirección de envío del pedido (paso nuevo en el carrito)
-- Corre este bloque en tu Workbench (Railway) para crear la tabla y
-- relacionarla con "producto" mediante la llave foránea pedido_id -> producto.id
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS direccion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    pais VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_direccion_pedido
        FOREIGN KEY (pedido_id) REFERENCES producto(id)
        ON DELETE CASCADE,
    UNIQUE KEY uq_direccion_pedido (pedido_id)
);

-- -------------------------------------------------------------------------
-- ACTUALIZACIÓN: Catálogo de productos (panel "Productos" del Admin)
-- OJO: esta tabla es el CATÁLOGO de lanzamientos que se muestra en Colección,
-- es distinta de la tabla "producto" de más arriba (que en realidad guarda
-- los PEDIDOS/compras de los clientes).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_lanzamiento VARCHAR(150) NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    imagen VARCHAR(255),
    imagen_public_id VARCHAR(255),
    estado ENUM('activo', 'suspendido') NOT NULL DEFAULT 'activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos semilla del primer lanzamiento (los mismos que ya existían hardcodeados en la web)
-- "imagen" queda en NULL: súbela desde el panel Admin (Editar > Agregar imagen)
-- una vez que el backend esté desplegado y conectado a Cloudinary.
INSERT INTO catalogo_productos (nombre_lanzamiento, nombre_producto, precio, imagen, estado) VALUES
    ('Lanzamiento 1', 'Oversized Buddha Tee', 110000.00, NULL, 'activo'),
    ('Lanzamiento 2', 'Oversized First', 110000.00, NULL, 'activo');

-- -------------------------------------------------------------------------
-- ACTUALIZACIÓN: Imágenes de productos ahora en Cloudinary (no en disco)
-- Si ya habías creado la tabla "catalogo_productos" antes de esta actualización
-- (como en Railway), corre solo esta línea para agregar la columna que falta:
-- -------------------------------------------------------------------------
ALTER TABLE catalogo_productos ADD COLUMN imagen_public_id VARCHAR(255);

-- -------------------------------------------------------------------------
-- ACTUALIZACIÓN: Notificaciones reales de la campanita del Admin
-- Antes vivían en localStorage (solo se veían en el navegador donde se hizo
-- la compra); ahora quedan en la BD para que se vean desde cualquier sesión
-- del Admin. Se crean automáticamente cuando un pedido queda "Aprobado".
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mensaje VARCHAR(255) NOT NULL,
    leida TINYINT(1) NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- ACTUALIZACIÓN: Galería de imágenes por producto (carrusel en Admin y Colección)
-- Antes cada producto del catálogo tenía una sola imagen (columnas "imagen" /
-- "imagen_public_id" en catalogo_productos). Esas columnas NO se tocan ni se
-- eliminan (siguen siendo la portada de respaldo); ahora, además, cada producto
-- puede tener varias imágenes guardadas en esta tabla aparte, ordenadas por
-- "orden". Corre este bloque en tu Workbench (Railway) si catalogo_productos
-- ya existía:
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_producto_imagenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    catalogo_producto_id INT NOT NULL,
    imagen VARCHAR(255) NOT NULL,
    imagen_public_id VARCHAR(255),
    orden INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_imagen_catalogo_producto
        FOREIGN KEY (catalogo_producto_id) REFERENCES catalogo_productos(id)
        ON DELETE CASCADE
);

-- Migra la imagen única que ya tenía cada producto a la tabla nueva (como
-- primera imagen de su carrusel), sin duplicar si el producto ya tiene filas.
INSERT INTO catalogo_producto_imagenes (catalogo_producto_id, imagen, imagen_public_id, orden)
SELECT id, imagen, imagen_public_id, 0
FROM catalogo_productos
WHERE imagen IS NOT NULL
  AND id NOT IN (SELECT catalogo_producto_id FROM catalogo_producto_imagenes);

-- -------------------------------------------------------------------------
-- ACTUALIZACIÓN: Talla comprada por pedido
-- OJO: esto va en la tabla "producto" (la de PEDIDOS/compras de clientes),
-- NO en "catalogo_productos" (esa es solo el catálogo que administra el panel
-- Admin y no cambia). Un pedido puede traer varios productos a la vez, así que
-- "talla" guarda una talla por línea del carrito en el mismo orden que ya usa
-- "nombre_producto" (separadas por coma), igual que ya se hace con ese campo.
-- Corre esta línea en tu Workbench (Railway):
-- -------------------------------------------------------------------------
ALTER TABLE producto ADD COLUMN talla VARCHAR(100);
