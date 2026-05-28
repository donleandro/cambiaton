import { db } from '$lib/server/db';
import { imports, users } from '$lib/server/db/schema';
import { grupoDe } from '$lib/server/groups';
import { calcularMatch, type InventarioAjeno } from '$lib/server/matcher';
import { getColeccionCompleta } from '$lib/server/collection';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, locals }) => {
	const importId = Number(params.id);
	if (!Number.isInteger(importId)) throw error(400, 'ID inválido');

	const [imp] = await db.select().from(imports).where(eq(imports.id, importId));
	if (!imp) throw error(404, 'Envío no encontrado');

	// Verificar token: solo el submitter puede ver su preview
	const token = url.searchParams.get('token');
	const [submitter] = await db.select().from(users).where(eq(users.id, imp.submitterId));
	if (!submitter || submitter.token !== token) {
		throw error(403, 'Token inválido');
	}

	// Match: calcular desde el punto de vista del submitter
	const miColeccion = await getColeccionCompleta(submitter.id);
	const dueno = await getColeccionCompleta(imp.toUserId);

	// Construir el inventario del dueño en formato InventarioAjeno
	const inventarioDueno: InventarioAjeno = {
		faltantes: dueno.filter((s) => !s.tengo).map((s) => s.id),
		repetidas: dueno.filter((s) => s.repetidas > 0).map((s) => ({ id: s.id, count: s.repetidas }))
	};

	const match = calcularMatch(miColeccion, inventarioDueno);

	const enrich = (items: typeof match.doy) =>
		items.map((it) => ({ ...it, grupo: grupoDe(it.equipo) }));

	const [duenoUser] = await db.select().from(users).where(eq(users.id, imp.toUserId));

	// El submitter siempre puede reclamar mientras la cuenta no tenga email,
	// aunque haya perdido la sesión: usa su token (válido porque ya lo verificó
	// arriba para mostrarle el match) para reautenticarse vía /reclamar.
	const puedeReclamar = !submitter.email;
	const redirectTo = `/compartir/exito/${imp.id}?token=${token}`;
	const reclamarHref =
		locals.user?.id === submitter.id
			? `/reclamar?redirect=${encodeURIComponent(redirectTo)}`
			: `/reclamar?token=${token}&redirect=${encodeURIComponent(redirectTo)}`;

	return {
		puedeReclamar,
		reclamarHref,
		importacion: {
			id: imp.id,
			nombre: submitter.nombre,
			fecha: imp.fecha,
			status: imp.status,
			duenoNombre: duenoUser?.nombre ?? 'el dueño'
		},
		match: {
			// match.doy = lo que YO doy = ellos reciben
			// match.recibo = lo que YO recibo = ellos dan
			ellosTeDan: enrich(match.recibo),
			vosLesDas: enrich(match.doy),
			balanceado: match.balanceado
		}
	};
};
