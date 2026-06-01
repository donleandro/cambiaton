-- Bitácora append-only de operaciones (idempotencia + auditoría), estilo ledger.
-- Cada request que muta colección deja un asiento inmutable:
--   - op_id: clave de idempotencia (UUID del cliente). PRIMARY KEY → UNIQUE a nivel
--     DB: un replay/doble-tap no se re-aplica (el segundo INSERT falla y el batch
--     entero hace rollback).
--   - user_id / created_at: quién y cuándo.
--   - kind / payload: qué se hizo (snapshot JSON para auditoría).
--   - ip / user_agent: desde qué red y dispositivo (forense; no es device-id exacto).
--
-- Idempotente de correr: CREATE TABLE IF NOT EXISTS. Seguro en prod (solo agrega,
-- no toca filas existentes).
CREATE TABLE IF NOT EXISTS `op_log` (
	`op_id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`payload` text,
	`ip` text,
	`user_agent` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_op_log_user` ON `op_log` (`user_id`, `created_at`);
