import { db } from './db';
import { stickers, colecciones, intercambios, opLog, type Intercambio } from './db/schema';
import { eq, sql, desc, and, inArray } from 'drizzle-orm';

/**
 * Contexto de auditoría: de dónde vino la request. Se propaga desde cada action
 * para que la bitácora registre quién/desde-dónde hizo cada cambio.
 */
export type OpCtx = { ip?: string | null; userAgent?: string | null };

/** ¿El error es por violación de UNIQUE/PRIMARY KEY (op_id duplicado)? */
function esConflictoUnico(e: unknown): boolean {
	const msg = e instanceof Error ? e.message : String(e);
	return /UNIQUE constraint failed|PRIMARY KEY|already exists|D1_ERROR.*UNIQUE/i.test(msg);
}

/**
 * Statement (sin await) que inserta el asiento en la bitácora. Va como PRIMER
 * elemento del batch: si el opId ya existe, el batch entero falla y NADA se
 * aplica → idempotencia + atomicidad en una sola transacción (estilo banco).
 */
function stmtOpLog(opId: string, userId: number, kind: string, payload: unknown, ctx?: OpCtx) {
	return db.insert(opLog).values({
		opId,
		userId,
		kind,
		payload: payload == null ? null : JSON.stringify(payload),
		ip: ctx?.ip ?? null,
		userAgent: ctx?.userAgent ?? null
	});
}

/** Statement: setear tengo (upsert). No lee, batchable. */
function stmtSetTengo(userId: number, stickerId: string, tengo: boolean) {
	return db
		.insert(colecciones)
		.values({ userId, stickerId, tengo, repetidas: 0 })
		.onConflictDoUpdate({
			target: [colecciones.userId, colecciones.stickerId],
			set: { tengo }
		});
}

/** Statement: bajar repetidas con piso en 0. Batchable. */
function stmtRepetidasBaja(userId: number, stickerId: string, n: number) {
	return db
		.update(colecciones)
		.set({ repetidas: sql`max(0, ${colecciones.repetidas} - ${n})` })
		.where(and(eq(colecciones.userId, userId), eq(colecciones.stickerId, stickerId)));
}

/** Statement: subir repetidas, sólo si tengo=true (no crea fila si no lo tiene). Batchable. */
function stmtRepetidasSuba(userId: number, stickerId: string, n: number) {
	return db
		.update(colecciones)
		.set({ repetidas: sql`${colecciones.repetidas} + ${n}` })
		.where(
			and(
				eq(colecciones.userId, userId),
				eq(colecciones.stickerId, stickerId),
				eq(colecciones.tengo, true)
			)
		);
}

/** Statement de cambio de repetidas según signo del delta. */
function stmtDeltaRepetidas(userId: number, stickerId: string, delta: number) {
	return delta >= 0
		? stmtRepetidasSuba(userId, stickerId, delta)
		: stmtRepetidasBaja(userId, stickerId, -delta);
}

/**
 * Aplica un conjunto de mutaciones de colección de forma ATÓMICA e IDEMPOTENTE.
 *
 * - Si `opId` viene: se inserta primero el asiento en `op_log` dentro del MISMO
 *   batch. Si ya existía (replay/doble-tap), el batch falla por UNIQUE y nada se
 *   aplica → devuelve { duplicado: true } sin efectos secundarios.
 * - Si `opId` es null (cliente viejo/cacheado sin la mejora): se aplica igual,
 *   pero atómico en batch. Sin dedup (no hay regresión vs comportamiento previo).
 *
 * `legs` son statements construidos con los helpers stmt* de arriba.
 */
export async function aplicarAtomico(args: {
	opId: string | null;
	userId: number;
	kind: string;
	payload?: unknown;
	ctx?: OpCtx;
	legs: unknown[];
}): Promise<{ ok: true; duplicado: boolean }> {
	const { opId, userId, kind, payload, ctx, legs } = args;
	if (legs.length === 0) return { ok: true, duplicado: false };

	// drizzle-d1 batch exige al menos un statement; tipamos laxo porque mezclamos
	// insert/update builders.
	const batch = (opId ? [stmtOpLog(opId, userId, kind, payload, ctx), ...legs] : legs) as [
		unknown,
		...unknown[]
	];
	try {
		// @ts-expect-error batch acepta tupla de queries drizzle
		await db.batch(batch);
		return { ok: true, duplicado: false };
	} catch (e) {
		if (opId && esConflictoUnico(e)) return { ok: true, duplicado: true };
		throw e;
	}
}

/** Builders expuestos para componer legs en las actions. */
export const legs = {
	setTengo: stmtSetTengo,
	deltaRepetidas: stmtDeltaRepetidas
};

export type StickerConEstado = {
	id: string;
	equipo: string;
	confederacion: string;
	numero: number;
	tipo: string;
	descripcion: string;
	tengo: boolean;
	repetidas: number;
	bloqueado: boolean;
};

/**
 * Devuelve TODOS los stickers del catálogo con el estado (tengo, repetidas)
 * del usuario dado. Los que no tienen fila en `colecciones` aparecen con
 * tengo=false, repetidas=0 vía LEFT JOIN.
 */
export async function getColeccionCompleta(userId: number): Promise<StickerConEstado[]> {
	const rows = await db
		.select({
			id: stickers.id,
			equipo: stickers.equipo,
			confederacion: stickers.confederacion,
			numero: stickers.numero,
			tipo: stickers.tipo,
			descripcion: stickers.descripcion,
			tengo: sql<number>`coalesce(${colecciones.tengo}, 0)`,
			repetidas: sql<number>`coalesce(${colecciones.repetidas}, 0)`,
			bloqueado: sql<number>`coalesce(${colecciones.bloqueado}, 0)`
		})
		.from(stickers)
		.leftJoin(
			colecciones,
			sql`${colecciones.stickerId} = ${stickers.id} AND ${colecciones.userId} = ${userId}`
		)
		.orderBy(stickers.equipo, stickers.id);

	return rows.map((r) => ({
		...r,
		tengo: Boolean(r.tengo),
		repetidas: Number(r.repetidas),
		bloqueado: Boolean(r.bloqueado)
	}));
}

/**
 * Upsert el estado de un sticker para un usuario. Crea la fila si no existe.
 */
export async function upsertColeccion(
	userId: number,
	stickerId: string,
	state: { tengo?: boolean; repetidas?: number }
): Promise<void> {
	const existing = await db
		.select()
		.from(colecciones)
		.where(sql`${colecciones.userId} = ${userId} AND ${colecciones.stickerId} = ${stickerId}`)
		.limit(1);

	if (existing.length === 0) {
		await db.insert(colecciones).values({
			userId,
			stickerId,
			tengo: state.tengo ?? false,
			repetidas: state.repetidas ?? 0
		});
	} else {
		await db
			.update(colecciones)
			.set(state)
			.where(sql`${colecciones.userId} = ${userId} AND ${colecciones.stickerId} = ${stickerId}`);
	}
}

/**
 * Toggle tengo. Crea la fila si no existe.
 */
export async function setTengo(userId: number, stickerId: string, tengo: boolean): Promise<void> {
	await upsertColeccion(userId, stickerId, { tengo });
}

/** ¿El "lo tengo" de este sticker está con candado? (repetidas NO se bloquean). */
export async function estaBloqueado(userId: number, stickerId: string): Promise<boolean> {
	const [row] = await db
		.select({ bloqueado: colecciones.bloqueado })
		.from(colecciones)
		.where(sql`${colecciones.userId} = ${userId} AND ${colecciones.stickerId} = ${stickerId}`)
		.limit(1);
	return Boolean(row?.bloqueado);
}

/**
 * Pone/saca el candado a TODO un equipo (solo a los stickers que el usuario
 * tiene). Devuelve cuántos quedaron afectados. Cerrar = proteger el "lo tengo".
 */
export async function setCandadoEquipo(
	userId: number,
	equipo: string,
	bloquear: boolean
): Promise<number> {
	const ids = (
		await db.select({ id: stickers.id }).from(stickers).where(eq(stickers.equipo, equipo))
	).map((r) => r.id);
	if (ids.length === 0) return 0;
	await db
		.update(colecciones)
		.set({ bloqueado: bloquear })
		.where(
			and(
				eq(colecciones.userId, userId),
				inArray(colecciones.stickerId, ids),
				eq(colecciones.tengo, true)
			)
		);
	const [{ n }] = await db
		.select({ n: sql<number>`count(*)` })
		.from(colecciones)
		.where(
			and(
				eq(colecciones.userId, userId),
				inArray(colecciones.stickerId, ids),
				eq(colecciones.tengo, true)
			)
		);
	return Number(n);
}

/**
 * Registra un intercambio aplicado (el LOG del Cambiatón). Guarda el snapshot
 * de IDs dados/recibidos y con quién, para que el cambio no se olvide.
 * Devuelve el id de la fila creada.
 */
export async function registrarIntercambio(args: {
	userId: number;
	dados: string[];
	recibidos: string[];
	contraparte?: string | null;
	contraparteUserId?: number | null;
	inicio?: string | null;
	opId?: string | null;
}): Promise<number> {
	const [row] = await db
		.insert(intercambios)
		.values({
			userId: args.userId,
			dados: args.dados,
			recibidos: args.recibidos,
			contraparte: args.contraparte?.trim() || null,
			contraparteUserId: args.contraparteUserId ?? null,
			inicio: args.inicio ?? null,
			opId: args.opId ?? null
		})
		.returning({ id: intercambios.id });
	return row.id;
}

/**
 * ¿Ya se aplicó una operación con este opId para este usuario? Sirve para que la
 * cola offline no aplique dos veces el mismo cambio si la request llega repetida.
 */
export async function intercambioAplicado(userId: number, opId: string): Promise<boolean> {
	const [row] = await db
		.select({ id: intercambios.id })
		.from(intercambios)
		.where(and(eq(intercambios.userId, userId), eq(intercambios.opId, opId)))
		.limit(1);
	return !!row;
}

/**
 * Movimientos de la bitácora (op_log) de un usuario, más recientes primero.
 * Por defecto trae los manuales/ajustes (los trades ya viven con más detalle en
 * `intercambios`); se puede acotar por `kinds`.
 */
export async function getMovimientos(
	userId: number,
	kinds?: string[],
	limit = 500
): Promise<
	{
		opId: string;
		kind: string;
		payload: string | null;
		ip: string | null;
		userAgent: string | null;
		createdAt: string;
	}[]
> {
	const where = kinds?.length
		? and(eq(opLog.userId, userId), inArray(opLog.kind, kinds))
		: eq(opLog.userId, userId);
	return db
		.select({
			opId: opLog.opId,
			kind: opLog.kind,
			payload: opLog.payload,
			ip: opLog.ip,
			userAgent: opLog.userAgent,
			createdAt: opLog.createdAt
		})
		.from(opLog)
		.where(where)
		.orderBy(desc(opLog.createdAt))
		.limit(limit);
}

/**
 * Historial de intercambios de un usuario, más recientes primero.
 */
export async function getIntercambios(userId: number): Promise<Intercambio[]> {
	return db
		.select()
		.from(intercambios)
		.where(eq(intercambios.userId, userId))
		.orderBy(desc(intercambios.id));
}

/**
 * Trae un intercambio del usuario (o null). Verifica pertenencia.
 */
export async function getIntercambio(userId: number, id: number): Promise<Intercambio | null> {
	const [row] = await db
		.select()
		.from(intercambios)
		.where(and(eq(intercambios.id, id), eq(intercambios.userId, userId)))
		.limit(1);
	return row ?? null;
}

/**
 * Actualiza el snapshot de un intercambio (tras un ajuste). NO toca la colección;
 * eso lo hace el caller calculando el diff.
 */
export async function actualizarIntercambio(
	userId: number,
	id: number,
	patch: { dados: string[]; recibidos: string[]; contraparte?: string | null }
): Promise<void> {
	await db
		.update(intercambios)
		.set({
			dados: patch.dados,
			recibidos: patch.recibidos,
			...(patch.contraparte !== undefined ? { contraparte: patch.contraparte?.trim() || null } : {})
		})
		.where(and(eq(intercambios.id, id), eq(intercambios.userId, userId)));
}

/**
 * Borra un intercambio del log (tras anularlo). El caller ya revirtió la colección.
 */
export async function eliminarIntercambio(userId: number, id: number): Promise<void> {
	await db
		.delete(intercambios)
		.where(and(eq(intercambios.id, id), eq(intercambios.userId, userId)));
}

/**
 * Sumar/restar a repetidas (cap en 0). Sólo permitido si tengo=true (regla
 * de negocio: la prioridad es completar el álbum antes que trackear extras).
 */
export async function deltaRepetidas(
	userId: number,
	stickerId: string,
	delta: number
): Promise<void> {
	if (delta > 0) {
		// Sólo subir si tengo=true. Si la fila no existe, falla silenciosamente
		// porque no tiene el sticker.
		const [existing] = await db
			.select({ tengo: colecciones.tengo, repetidas: colecciones.repetidas })
			.from(colecciones)
			.where(sql`${colecciones.userId} = ${userId} AND ${colecciones.stickerId} = ${stickerId}`)
			.limit(1);
		if (!existing || !existing.tengo) return;
		await db
			.update(colecciones)
			.set({ repetidas: existing.repetidas + delta })
			.where(sql`${colecciones.userId} = ${userId} AND ${colecciones.stickerId} = ${stickerId}`);
	} else {
		// Bajar siempre permitido (cap 0)
		await db
			.update(colecciones)
			.set({ repetidas: sql`max(0, ${colecciones.repetidas} + ${delta})` })
			.where(sql`${colecciones.userId} = ${userId} AND ${colecciones.stickerId} = ${stickerId}`);
	}
}
