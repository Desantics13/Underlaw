-- ============================================================================
-- MIGRACIÓN: Producto destacado del inicio (pestaña "Imágenes" del Admin)
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
-- No toca ninguna tabla existente y no inserta datos: sin producto elegido, el
-- inicio muestra automáticamente el producto activo más reciente del catálogo.
--
-- Orden de despliegue: correr ESTE script en Railway primero y después
-- desplegar el código (el código nuevo igual tolera que la tabla falte).
-- ============================================================================

-- USE railway;

-- Ajustes sueltos del sitio (clave -> valor). Claves que usa el backend:
--   producto_destacado_id  id de catalogo_productos que se muestra en el
--                          bloque de producto del inicio cuando no hay
--                          lanzamiento activo (vacío = automático)
CREATE TABLE IF NOT EXISTS sitio_ajustes (
    clave VARCHAR(60) PRIMARY KEY,
    valor VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
