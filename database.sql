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
