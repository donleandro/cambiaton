-- Candado del "lo tengo": columna `bloqueado` en colecciones. Protege que un
-- sticker ya marcado no se desmarque por accidente (cerrar equipos completos).
-- NO afecta repetidas (esas son moneda de cambio y se mueven siempre).
--
-- SQLite no soporta ADD COLUMN IF NOT EXISTS: correr una sola vez. Solo agrega
-- columna con default, no toca filas existentes (todas quedan bloqueado=0).
ALTER TABLE `colecciones` ADD COLUMN `bloqueado` integer NOT NULL DEFAULT 0;
