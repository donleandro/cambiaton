import { db } from '$lib/server/db';
import { imports, users } from '$lib/server/db/schema';
import { calcularMatch, type InventarioAjeno } from '$lib/server/matcher';
import { getColeccionCompleta } from '$lib/server/collection';
import { desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');

	const lista = await db
		.select({
			id: imports.id,
			fecha: imports.fecha,
			status: imports.status,
			origen: imports.origen,
			submitterId: imports.submitterId,
			submitterNombre: users.nombre
		})
		.from(imports)
		.leftJoin(users, eq(users.id, imports.submitterId))
		.where(eq(imports.toUserId, locals.user.id))
		.orderBy(desc(imports.id));

	const miColeccion = await getColeccionCompleta(locals.user.id);

	const enriquecidos = await Promise.all(
		lista.map(async (imp) => {
			const suColeccion = await getColeccionCompleta(imp.submitterId);
			const inventarioAjeno: InventarioAjeno = {
				faltantes: suColeccion.filter((s) => !s.tengo).map((s) => s.id),
				repetidas: suColeccion.filter((s) => s.repetidas > 0).map((s) => ({ id: s.id, count: s.repetidas }))
			};
			const match = calcularMatch(miColeccion, inventarioAjeno);
			return {
				id: imp.id,
				nombre: imp.submitterNombre ?? 'Anónimo',
				fecha: imp.fecha,
				status: imp.status,
				origen: imp.origen,
				doy: match.doy.length,
				recibo: match.recibo.length,
				balanceado: match.balanceado
			};
		})
	);

	const pendientes = enriquecidos.filter((e) => e.status === 'pendiente').length;
	const aplicados = enriquecidos.filter((e) => e.status === 'aplicado').length;
	const archivados = enriquecidos.filter((e) => e.status === 'archivado').length;

	return {
		intercambios: enriquecidos,
		stats: { pendientes, aplicados, archivados, total: enriquecidos.length }
	};
};
