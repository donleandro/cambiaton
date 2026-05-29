import { db } from '$lib/server/db';
import { stickers } from '$lib/server/db/schema';
import { eq, like, or, asc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');
	if (!locals.user.isAdmin) throw error(403, 'Solo admin');

	// Mostramos todo lo que tenga descripción placeholder o vacía. Si después
	// querés revisar otras, podés extender el filtro.
	const pendientes = await db
		.select()
		.from(stickers)
		.where(or(like(stickers.descripcion, '(pendiente%'), eq(stickers.descripcion, '')))
		.orderBy(asc(stickers.numero));

	const totales = await db.select().from(stickers);
	return {
		pendientes,
		totalCatalogo: totales.length,
		totalPendientes: pendientes.length
	};
};

export const actions: Actions = {
	updateDescripcion: async ({ request, locals }) => {
		if (!locals.user?.isAdmin) return fail(403);
		const data = await request.formData();
		const id = String(data.get('id') ?? '').trim();
		const descripcion = String(data.get('descripcion') ?? '').trim();
		if (!id) return fail(400, { error: 'ID requerido' });
		if (!descripcion) return fail(400, { id, error: 'Descripción vacía' });

		await db.update(stickers).set({ descripcion }).where(eq(stickers.id, id));
		return { ok: true, id, descripcion };
	}
};
