import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const stickers = sqliteTable('stickers', {
	id: text('id').primaryKey(),
	equipo: text('equipo').notNull(),
	confederacion: text('confederacion').notNull(),
	numero: integer('numero').notNull(),
	tipo: text('tipo').notNull(),
	descripcion: text('descripcion').notNull().default(''),
	tengo: integer('tengo', { mode: 'boolean' }).notNull().default(false),
	repetidas: integer('repetidas').notNull().default(0)
});

export const extras = sqliteTable('extras', {
	id: text('id').primaryKey(),
	jugador: text('jugador').notNull(),
	variante: text('variante').notNull(),
	tengo: integer('tengo', { mode: 'boolean' }).notNull().default(false),
	repetidas: integer('repetidas').notNull().default(0)
});

export const imports = sqliteTable('imports', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	fecha: text('fecha').notNull().$defaultFn(() => new Date().toISOString()),
	nombre: text('nombre').notNull(),
	payload: text('payload', { mode: 'json' }).notNull().$type<{
		faltantes: string[];
		repetidas: { id: string; count: number }[];
	}>(),
	status: text('status', { enum: ['pendiente', 'aplicado', 'archivado'] })
		.notNull()
		.default('pendiente'),
	origen: text('origen', { enum: ['publico', 'manual'] }).notNull().default('manual')
});

export const loginAttempts = sqliteTable('login_attempts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	ip: text('ip').notNull(),
	fecha: integer('fecha').notNull(), // unix ms
	success: integer('success', { mode: 'boolean' }).notNull()
});

export type Sticker = typeof stickers.$inferSelect;
export type Extra = typeof extras.$inferSelect;
export type Import = typeof imports.$inferSelect;
