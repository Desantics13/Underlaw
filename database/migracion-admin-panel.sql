-- ============================================================================
-- MIGRACIÓN: Seguridad del Admin (solo referencia) + Secciones + campos nuevos
-- de producto/lanzamiento (descripción, detalle, tallas, sección)
-- ----------------------------------------------------------------------------
-- Cómo correrlo en MySQL Workbench SIN que se corrompa al copiar/pegar:
--   1. File > Open SQL Script...  y elige este archivo.
--   2. Arriba, en el desplegable de esquemas, selecciona la base correcta:
--        - Local:   under_law_db
--        - Railway:  normalmente "railway"
--   3. Click en el rayo ⚡ (Execute) o Ctrl+Shift+Enter para correr todo.
--
-- Es seguro correrlo sobre datos existentes: no borra ni sobreescribe filas.
-- Requiere que catalogo_productos y lanzamientos ya existan.
-- ============================================================================

-- USE railway;

-- -------------------------------------------------------------------------
-- Secciones de la Colección (pestañas en /products)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS secciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------------------
-- Campos nuevos en catalogo_productos: descripcion, detalle, tallas, seccion_id
-- Los productos existentes quedan con las 4 tallas de siempre disponibles
-- (mismo comportamiento que tenían antes de este cambio).
-- -------------------------------------------------------------------------
ALTER TABLE catalogo_productos ADD COLUMN descripcion TEXT NULL;
ALTER TABLE catalogo_productos ADD COLUMN detalle VARCHAR(120) NULL;
ALTER TABLE catalogo_productos ADD COLUMN tallas JSON NULL;
ALTER TABLE catalogo_productos ADD COLUMN seccion_id INT NULL;
ALTER TABLE catalogo_productos ADD CONSTRAINT fk_catalogo_producto_seccion
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE SET NULL;

UPDATE catalogo_productos
SET tallas = JSON_ARRAY(
    JSON_OBJECT('talla', 'S', 'disponible', TRUE),
    JSON_OBJECT('talla', 'M', 'disponible', TRUE),
    JSON_OBJECT('talla', 'L', 'disponible', TRUE),
    JSON_OBJECT('talla', 'XL', 'disponible', TRUE)
)
WHERE tallas IS NULL;

-- -------------------------------------------------------------------------
-- Los mismos campos nuevos en lanzamientos (se copian al producto real cuando
-- el lanzamiento se publica, ver backend/services/LanzamientoService.js).
-- -------------------------------------------------------------------------
ALTER TABLE lanzamientos ADD COLUMN descripcion TEXT NULL;
ALTER TABLE lanzamientos ADD COLUMN detalle VARCHAR(120) NULL;
ALTER TABLE lanzamientos ADD COLUMN tallas JSON NULL;
ALTER TABLE lanzamientos ADD COLUMN seccion_id INT NULL;
ALTER TABLE lanzamientos ADD CONSTRAINT fk_lanzamiento_seccion
    FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE SET NULL;

UPDATE lanzamientos
SET tallas = JSON_ARRAY(
    JSON_OBJECT('talla', 'S', 'disponible', TRUE),
    JSON_OBJECT('talla', 'M', 'disponible', TRUE),
    JSON_OBJECT('talla', 'L', 'disponible', TRUE),
    JSON_OBJECT('talla', 'XL', 'disponible', TRUE)
)
WHERE tallas IS NULL;
