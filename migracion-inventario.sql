-- ============================================================================
-- MIGRACIÓN: Inventario real por producto y talla, conectado con las ventas
-- ----------------------------------------------------------------------------
-- Cómo correrlo en MySQL Workbench SIN que se corrompa al copiar/pegar:
--   1. File > Open SQL Script...  y elige este archivo.
--   2. Arriba, en el desplegable de esquemas, selecciona la base correcta:
--        - Local:   under_law_db
--        - Railway:  normalmente "railway"
--   3. Click en el rayo ⚡ (Execute) o Ctrl+Shift+Enter para correr todo.
--
-- Es seguro correrlo sobre datos existentes y se puede correr dos veces sin
-- romper nada (los UPDATE de tallas están protegidos para no re-aplicarse).
-- Requiere MySQL 8 (usa JSON_TABLE, ya disponible en Railway).
-- ============================================================================

-- USE railway;

-- -------------------------------------------------------------------------
-- 1. Cambia el interruptor manual "disponible" (true/false) por cantidad real
--    en stock. cantidad = NULL sigue significando "sin contar" (se vende sin
--    límite, como funcionaba antes); cantidad = 0, 1, 2... es el stock real.
--    Migración: disponible=false -> cantidad 0; disponible=true -> cantidad NULL.
--    El WHERE con JSON_CONTAINS_PATH hace que correr esto dos veces no
--    sobreescriba datos que ya estén en el formato nuevo.
-- -------------------------------------------------------------------------
UPDATE catalogo_productos cp
JOIN (
    SELECT cp2.id AS id,
           JSON_ARRAYAGG(JSON_OBJECT('talla', jt.talla, 'cantidad', IF(jt.disponible = 'true', NULL, 0))) AS nuevas
    FROM catalogo_productos cp2,
         JSON_TABLE(cp2.tallas, '$[*]' COLUMNS (talla VARCHAR(20) PATH '$.talla', disponible VARCHAR(10) PATH '$.disponible')) AS jt
    WHERE JSON_CONTAINS_PATH(cp2.tallas, 'one', '$[0].disponible') = 1
    GROUP BY cp2.id
) t ON t.id = cp.id
SET cp.tallas = t.nuevas
WHERE JSON_CONTAINS_PATH(cp.tallas, 'one', '$[0].disponible') = 1;

UPDATE lanzamientos l
JOIN (
    SELECT l2.id AS id,
           JSON_ARRAYAGG(JSON_OBJECT('talla', jt.talla, 'cantidad', IF(jt.disponible = 'true', NULL, 0))) AS nuevas
    FROM lanzamientos l2,
         JSON_TABLE(l2.tallas, '$[*]' COLUMNS (talla VARCHAR(20) PATH '$.talla', disponible VARCHAR(10) PATH '$.disponible')) AS jt
    WHERE JSON_CONTAINS_PATH(l2.tallas, 'one', '$[0].disponible') = 1
    GROUP BY l2.id
) t ON t.id = l.id
SET l.tallas = t.nuevas
WHERE JSON_CONTAINS_PATH(l.tallas, 'one', '$[0].disponible') = 1;

-- -------------------------------------------------------------------------
-- 2. Marca de "ya descontado" en el pedido (tabla "producto" = pedidos/compras)
--    para que el descuento de inventario nunca se aplique dos veces al mismo
--    pedido, sin importar cuántas veces se reconcilie su estado.
-- -------------------------------------------------------------------------
ALTER TABLE producto ADD COLUMN inventario_descontado TINYINT(1) NOT NULL DEFAULT 0;

-- -------------------------------------------------------------------------
-- 3. Detalle estructurado de qué se compró en cada pedido (producto + talla +
--    cantidad). Antes solo se guardaba como texto en "nombre_producto"/"talla"
--    de la tabla "producto"; esto permite descontar el inventario exacto
--    aunque el carrito tenga varios productos o varias tallas del mismo.
--    Se llena al iniciar el pago (POST /api/wompi/iniciar).
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT NOT NULL,
    producto_id INT NULL,
    nombre_producto VARCHAR(150) NOT NULL,
    talla VARCHAR(20) NULL,
    cantidad INT NOT NULL,
    CONSTRAINT fk_pedido_item_pedido
        FOREIGN KEY (pedido_id) REFERENCES producto(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_pedido_item_producto
        FOREIGN KEY (producto_id) REFERENCES catalogo_productos(id)
        ON DELETE SET NULL,
    INDEX idx_pedido_item_pedido (pedido_id)
);
