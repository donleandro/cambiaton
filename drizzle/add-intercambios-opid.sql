-- Solo para entornos que YA tenían la tabla `intercambios` sin op_id (dev local).
-- En prod no hace falta: la tabla se crea de cero con add-intercambios.sql.
-- SQLite no soporta ADD COLUMN IF NOT EXISTS: correr una sola vez.
ALTER TABLE `intercambios` ADD COLUMN `op_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_intercambios_opid` ON `intercambios` (`user_id`, `op_id`) WHERE `op_id` IS NOT NULL;
