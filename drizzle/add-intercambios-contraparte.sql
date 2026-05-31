-- Solo para entornos que YA tenían la tabla `intercambios` sin la columna
-- (ej: dev local creado antes de este cambio). En prod no hace falta porque
-- la tabla se crea de cero con add-intercambios.sql ya incluyendo la columna.
-- SQLite no soporta ADD COLUMN IF NOT EXISTS: correr una sola vez.
ALTER TABLE `intercambios` ADD COLUMN `contraparte_user_id` integer;
