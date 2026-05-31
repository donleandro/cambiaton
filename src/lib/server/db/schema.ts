import { integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

/**
 * Catálogo global de stickers (lo que existe en el álbum).
 * Este shape ya NO incluye `tengo`/`repetidas` — esos pasaron a vivir
 * en la tabla `colecciones` por usuario.
 */
export const stickers = sqliteTable('stickers', {
	id: text('id').primaryKey(),
	equipo: text('equipo').notNull(),
	confederacion: text('confederacion').notNull(),
	numero: integer('numero').notNull(),
	tipo: text('tipo').notNull(),
	descripcion: text('descripcion').notNull().default('')
});

export const extras = sqliteTable('extras', {
	id: text('id').primaryKey(),
	jugador: text('jugador').notNull(),
	variante: text('variante').notNull()
});

/**
 * Usuario. Creado automáticamente al primer submit en /compartir (con sólo
 * `token` + `nombre`), o explícitamente vía /registro (con email + password).
 *   - token: identificador anónimo persistente, embebido en URL de retorno
 *   - email + password_hash: opcional, sólo si "reclama" la cuenta
 *   - claimed_at: cuándo agregó email+password (null = todavía anónimo)
 *   - is_admin: vos sos true (única cuenta así por ahora)
 */
export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	token: text('token').notNull().unique(),
	nombre: text('nombre').notNull(),
	email: text('email').unique(),
	passwordHash: text('password_hash'),
	isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
	createdAt: text('created_at')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	claimedAt: text('claimed_at')
});

/**
 * Estado de la colección de un usuario sobre un sticker dado.
 * PK compuesta (user_id, sticker_id). Si una fila no existe → tengo=false, repetidas=0.
 */
export const colecciones = sqliteTable(
	'colecciones',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		stickerId: text('sticker_id')
			.notNull()
			.references(() => stickers.id, { onDelete: 'cascade' }),
		tengo: integer('tengo', { mode: 'boolean' }).notNull().default(false),
		repetidas: integer('repetidas').notNull().default(0)
	},
	(t) => [primaryKey({ columns: [t.userId, t.stickerId] })]
);

/**
 * Cada vez que alguien submitea su lista a otro usuario (típicamente al admin),
 * se crea un import. Mantiene historial y permite re-aplicar después si la
 * colección cambia. Reemplaza el modelo anterior 1-a-1.
 *   - submitter_id: el que envió la lista (puede ser anonymous user)
 *   - to_user_id: el dueño que va a procesar/aprobar
 *   - payload: snapshot opcional al momento del submit (para auditoría)
 */
export const imports = sqliteTable('imports', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	fecha: text('fecha')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	submitterId: integer('submitter_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	toUserId: integer('to_user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	status: text('status', { enum: ['pendiente', 'aplicado', 'archivado'] })
		.notNull()
		.default('pendiente'),
	origen: text('origen', { enum: ['publico', 'manual'] })
		.notNull()
		.default('manual')
});

/**
 * Registro de cada intercambio aplicado desde el Cambiatón. Es el LOG: sin
 * esto, al aplicar el cambio se modificaba la colección sin dejar traza y "el
 * cambio podía olvidarse".
 *   - userId: dueño de la colección que confirmó el cambio
 *   - contraparte: con quién cambiaste (texto libre, opcional — ej "Juan")
 *   - dados/recibidos: snapshot de los IDs en cada lado al momento de confirmar
 *   - inicio: por qué lista arrancó el flujo ('mis-faltantes' | 'mis-repetidas')
 */
export const intercambios = sqliteTable('intercambios', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	fecha: text('fecha')
		.notNull()
		.$defaultFn(() => new Date().toISOString()),
	contraparte: text('contraparte'),
	// Si el cambio fue contra un usuario del sistema (ej: aplicar una lista
	// compartida), guardamos su id para poder revertir su lado al ajustar.
	// null = cambiatón manual (contraparte solo texto libre).
	contraparteUserId: integer('contraparte_user_id'),
	dados: text('dados', { mode: 'json' }).notNull().$type<string[]>(),
	recibidos: text('recibidos', { mode: 'json' }).notNull().$type<string[]>(),
	inicio: text('inicio')
});

export const loginAttempts = sqliteTable('login_attempts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	ip: text('ip').notNull(),
	fecha: integer('fecha').notNull(),
	success: integer('success', { mode: 'boolean' }).notNull()
});

export type Sticker = typeof stickers.$inferSelect;
export type Extra = typeof extras.$inferSelect;
export type User = typeof users.$inferSelect;
export type Coleccion = typeof colecciones.$inferSelect;
export type Import = typeof imports.$inferSelect;
export type Intercambio = typeof intercambios.$inferSelect;

/**
 * Vista agregada de un sticker con el estado del usuario. Lo que usan las páginas.
 */
export type StickerConEstado = Sticker & { tengo: boolean; repetidas: number };
