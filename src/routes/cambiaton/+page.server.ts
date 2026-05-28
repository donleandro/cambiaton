import { getColeccionCompleta, setTengo, deltaRepetidas } from '$lib/server/collection';
import { grupoDe } from '$lib/server/groups';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');
	const all = await getColeccionCompleta(locals.user.id);

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
	confirmar: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { error: 'No autenticado' });
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

		// DADOS: -1 repetida en mi colección
		for (const id of dados) {
			await deltaRepetidas(locals.user.id, id, -1);
		}
		// RECIBIDOS: tengo = true
		for (const id of recibidos) {
			await setTengo(locals.user.id, id, true);
		}

		return { ok: true, dados: dados.length, recibidos: recibidos.length };
	}
};
