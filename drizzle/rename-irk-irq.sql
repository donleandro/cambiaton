-- Renombrar IRK → IRQ (código FIFA oficial) y "Irak" → "Iraq"
-- Estrategia:
--   1. Insertar 20 nuevos stickers IRQ-XX con la misma data
--   2. Copiar las filas de colecciones referenciando IRK-XX hacia IRQ-XX
--   3. Borrar los stickers IRK-XX (CASCADE limpia las colecciones viejas)
-- Idempotente: usa INSERT OR REPLACE.

-- 1. crear los IRQ-* a partir de los IRK-*
INSERT OR REPLACE INTO stickers (id, equipo, confederacion, numero, tipo, descripcion)
SELECT REPLACE(id, 'IRK-', 'IRQ-'), 'Iraq', confederacion, numero, tipo, descripcion
FROM stickers
WHERE id LIKE 'IRK-%';

-- 2. mover las filas de colecciones
INSERT OR REPLACE INTO colecciones (user_id, sticker_id, tengo, repetidas)
SELECT user_id, REPLACE(sticker_id, 'IRK-', 'IRQ-'), tengo, repetidas
FROM colecciones
WHERE sticker_id LIKE 'IRK-%';

-- 3. borrar los IRK-* (cascade limpia colecciones viejas)
DELETE FROM stickers WHERE id LIKE 'IRK-%';
