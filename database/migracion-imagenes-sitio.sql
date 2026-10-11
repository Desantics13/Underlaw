-- ============================================================================
-- MIGRACIÓN: Imágenes y videos del sitio (pestaña "Imágenes" del Admin)
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
-- No toca ninguna tabla existente y no inserta datos: con las tablas vacías el
-- sitio usa sus imágenes y videos por defecto, igual que antes.
--
-- Orden de despliegue: correr ESTE script en Railway primero y después
-- desplegar el código (el código nuevo igual tolera que las tablas falten).
-- ============================================================================

-- USE railway;

-- Imágenes por zona. Zonas válidas (las valida el backend):
--   home_hero        carrusel del hero del inicio (varias, con orden)
--   home_producto    imagen del bloque "Recién llegado" (una sola)
--   racing_izquierda foto izquierda del hero de /racing (una sola)
--   racing_derecha   foto derecha del hero de /racing (una sola)
CREATE TABLE IF NOT EXISTS sitio_imagenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zona VARCHAR(40) NOT NULL,
    url VARCHAR(500) NOT NULL,
    public_id VARCHAR(255) NULL,
    posicion VARCHAR(40) NOT NULL DEFAULT 'center center',
    alt VARCHAR(200) NULL,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sitio_imagenes_zona_orden (zona, orden)
);

-- Videos de YouTube de /racing, en el orden indicado.
CREATE TABLE IF NOT EXISTS sitio_videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    youtube_url VARCHAR(300) NOT NULL,
    orden INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sitio_videos_orden (orden)
);
