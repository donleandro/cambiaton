-- Registro (log) de intercambios aplicados desde el Cambiatón.
-- Idempotente: seguro de correr en local.db, D1 local y D1 remota.
CREATE TABLE IF NOT EXISTS `intercambios` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`fecha` text NOT NULL,
	`contraparte` text,
	`contraparte_user_id` integer,
	`dados` text NOT NULL,
	`recibidos` text NOT NULL,
	`inicio` text,
	`op_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_intercambios_user` ON `intercambios` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_intercambios_opid` ON `intercambios` (`user_id`, `op_id`) WHERE `op_id` IS NOT NULL;
