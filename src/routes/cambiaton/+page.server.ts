import { db } from '$lib/server/db';
import { stickers } from '$lib/server/db/schema';
import { grupoDe } from '$lib/server/groups';
import { inArray, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const all = await db.select().from(stickers).orderBy(stickers.id);

	const misFaltantes = all
		.filter((s) => !s.tengo)
		.map((s) => ({
			id: s.id,
			equipo: s.equipo,
			numero: s.numero,
			confederacion: s.confederacion,
			grupo: grupoDe(s.equipo)
		}));

	const misRepetidas = all
		.filter((s) => s.repetidas > 0)
		.map((s) => ({
			id: s.id,
			equipo: s.equipo,
			numero: s.numero,
			confederacion: s.confederacion,
			grupo: grupoDe(s.equipo),
			repetidas: s.repetidas
		}));

	return { misFaltantes, misRepetidas };
};

export const actions: Actions = {
	confirmar: async ({ request }) => {
		const data = await request.formData();
		const dados = String(data.get('dados') ?? '')
			.split(',')
			.filter(Boolean);
		const recibidos = String(data.get('recibidos') ?? '')
			.split(',')
			.filter(Boolean);

		if (dados.length === 0 && recibidos.length === 0) {
			return fail(400, { error: 'No seleccionaste nada para intercambiar.' });
		}

		if (dados.length > 0) {
			await db
				.update(stickers)
				.set({ repetidas: sql`max(0, ${stickers.repetidas} - 1)` })
				.where(inArray(stickers.id, dados));
		}

		if (recibidos.length > 0) {
			await db
				.update(stickers)
				.set({ tengo: true })
				.where(inArray(stickers.id, recibidos));
		}

		return { ok: true, dados: dados.length, recibidos: recibidos.length };
	}
};
