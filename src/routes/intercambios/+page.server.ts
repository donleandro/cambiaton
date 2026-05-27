import { db } from '$lib/server/db';
import { stickers, imports } from '$lib/server/db/schema';
import { calcularMatch, type InventarioAjeno } from '$lib/server/matcher';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const all = await db.select().from(stickers);
	const lista = await db.select().from(imports).orderBy(desc(imports.id));

	const enriquecidos = lista.map((imp) => {
		const ajeno = imp.payload as InventarioAjeno;
		const match = calcularMatch(all, ajeno);
		return {
			id: imp.id,
			nombre: imp.nombre,
			fecha: imp.fecha,
			status: imp.status,
			origen: imp.origen,
			doy: match.doy.length,
			recibo: match.recibo.length,
			balanceado: match.balanceado
		};
	});

	const pendientes = enriquecidos.filter((e) => e.status === 'pendiente').length;
	const aplicados = enriquecidos.filter((e) => e.status === 'aplicado').length;
	const archivados = enriquecidos.filter((e) => e.status === 'archivado').length;

	return {
		intercambios: enriquecidos,
		stats: { pendientes, aplicados, archivados, total: enriquecidos.length }
	};
};
