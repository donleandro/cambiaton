CREATE TABLE `colecciones` (
	`user_id` integer NOT NULL,
	`sticker_id` text NOT NULL,
	`tengo` integer DEFAULT false NOT NULL,
	`repetidas` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `sticker_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `extras` (
	`id` text PRIMARY KEY NOT NULL,
	`jugador` text NOT NULL,
	`variante` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `imports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`fecha` text NOT NULL,
	`submitter_id` integer NOT NULL,
	`to_user_id` integer NOT NULL,
	`status` text DEFAULT 'pendiente' NOT NULL,
	`origen` text DEFAULT 'manual' NOT NULL,
	FOREIGN KEY (`submitter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ip` text NOT NULL,
	`fecha` integer NOT NULL,
	`success` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stickers` (
	`id` text PRIMARY KEY NOT NULL,
	`equipo` text NOT NULL,
	`confederacion` text NOT NULL,
	`numero` integer NOT NULL,
	`tipo` text NOT NULL,
	`descripcion` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`nombre` text NOT NULL,
	`email` text,
	`password_hash` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`claimed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_token_unique` ON `users` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);