import { db } from './db';
import { stickers, colecciones, intercambios, type Intercambio } from './db/schema';
import { eq, sql, desc, and } from 'drizzle-orm';

export type StickerConEstado = {
	id: string;
	equipo: string;
	confederacion: string;
	numero: number;
	tipo: string;
	descripcion: string;
	tengo: boolean;
	repetidas: number;
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
			repetidas: sql<number>`coalesce(${colecciones.repetidas}, 0)`
		})
		.from(stickers)
		.leftJoin(
			colecciones,
			sql`${colecciones.stickerId} = ${stickers.id} AND ${colecciones.userId} = ${userId}`
		)
		.orderBy(stickers.equipo, stickers.id);

	return rows.map((r) => ({ ...r, tengo: Boolean(r.tengo), repetidas: Number(r.repetidas) }));
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
}): Promise<number> {
	const [row] = await db
		.insert(intercambios)
		.values({
			userId: args.userId,
			dados: args.dados,
			recibidos: args.recibidos,
			contraparte: args.contraparte?.trim() || null,
			contraparteUserId: args.contraparteUserId ?? null,
			inicio: args.inicio ?? null
		})
		.returning({ id: intercambios.id });
	return row.id;
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
