import { db } from './db';
import { stickers, colecciones } from './db/schema';
import { eq, sql } from 'drizzle-orm';

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
