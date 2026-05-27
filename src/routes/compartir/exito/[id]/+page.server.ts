import { db } from '$lib/server/db';
import { stickers, imports } from '$lib/server/db/schema';
import { grupoDe } from '$lib/server/groups';
import { calcularMatch, type InventarioAjeno } from '$lib/server/matcher';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const importId = Number(params.id);
	if (!Number.isInteger(importId)) throw error(400, 'ID inválido');

	const [imp] = await db.select().from(imports).where(eq(imports.id, importId));
	if (!imp) throw error(404, 'Envío no encontrado');

	const all = await db.select().from(stickers);
	const ajeno = imp.payload as InventarioAjeno;
	const match = calcularMatch(all, ajeno);

	const enrich = (items: typeof match.doy) =>
		items.map((it) => ({ ...it, grupo: grupoDe(it.equipo) }));

	return {
		importacion: { id: imp.id, nombre: imp.nombre, fecha: imp.fecha, status: imp.status },
		match: {
			// Desde el punto de vista del submitter, lo que YO doy es lo que él RECIBE,
			// y lo que YO recibo es lo que él DA. Invierto las etiquetas.
			ellosTeDan: enrich(match.doy),
			vosLesDas: enrich(match.recibo),
			balanceado: match.balanceado
		}
	};
};
