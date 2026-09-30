-- ============================================================================
-- MIGRACIÓN: Sistema de Lanzamiento (drop) con cuenta regresiva
-- ----------------------------------------------------------------------------
-- Cómo correrlo en MySQL Workbench SIN que se corrompa al copiar/pegar:
--   1. File > Open SQL Script...  y elige este archivo.
--   2. Arriba, en el desplegable de esquemas (o haz doble clic en el panel
--      izquierdo), selecciona la base correcta:
--        - Local:   under_law_db
--        - Railway:  normalmente "railway"
--      Descomenta y ajusta la línea USE de abajo si prefieres fijarla acá.
--   3. Click en el rayo ⚡ (Execute) o Ctrl+Shift+Enter para correr todo.
--
-- Es idempotente (CREATE TABLE IF NOT EXISTS): se puede correr dos veces.
-- Requiere que la tabla catalogo_productos ya exista (por la llave foránea).
-- Requiere MySQL 5.7+ (por la columna JSON). Railway usa MySQL 8.
-- ============================================================================

-- USE railway;

CREATE TABLE IF NOT EXISTS lanzamientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_lanzamiento VARCHAR(150) NOT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    imagenes JSON NOT NULL,
    fecha_lanzamiento DATETIME NOT NULL,
    activo_en_home TINYINT(1) NOT NULL DEFAULT 0,
    estado ENUM('programado','lanzado') NOT NULL DEFAULT 'programado',
    producto_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_lanzamiento_pendiente (estado, fecha_lanzamiento),
    CONSTRAINT fk_lanzamiento_producto FOREIGN KEY (producto_id) REFERENCES catalogo_productos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lanzamiento_inscritos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lanzamiento_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notificado_at DATETIME NULL,
    CONSTRAINT fk_inscrito_lanzamiento FOREIGN KEY (lanzamiento_id) REFERENCES lanzamientos(id) ON DELETE CASCADE,
    CONSTRAINT uq_inscrito_correo_lanzamiento UNIQUE (lanzamiento_id, correo)
);
