-- Rate-limit genérico por IP (registro / compartir público). Separado de
-- login_attempts para no mezclar con el lockout de login. Solo agrega tabla.
CREATE TABLE IF NOT EXISTS `rate_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`kind` text NOT NULL,
	`fecha` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_rate_events_ip_kind` ON `rate_events` (`ip`, `kind`, `fecha`);
