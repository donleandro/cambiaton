import { getColeccionCompleta, setTengo, deltaRepetidas } from '$lib/server/collection';
import { grupoDe, posicionAlbum } from '$lib/server/groups';
import type { Actions, PageServerLoad } from './$types';
import { error, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');

	const all = await getColeccionCompleta(locals.user.id);
	const enriched = all.map((s) => ({
		...s,
		grupo: grupoDe(s.equipo),
		posicion: posicionAlbum(s.equipo)
	}));

	const tengo = enriched.filter((s) => s.tengo).length;
	const faltan = enriched.length - tengo;
	const repetidasTotal = enriched.reduce((acc, s) => acc + s.repetidas, 0);
	const equipos = Array.from(new Set(enriched.map((s) => s.equipo))).sort((a, b) =>
		a.localeCompare(b, 'es')
	);
	const confederaciones = Array.from(new Set(enriched.map((s) => s.confederacion))).sort();

	return {
		stickers: enriched,
		stats: { total: enriched.length, tengo, faltan, repetidasTotal },
		equipos,
		confederaciones,
		needsClaim: !locals.user.email
	};
};

export const actions: Actions = {
	toggleTengo: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const tengo = data.get('tengo') === 'true';
		if (!id) return fail(400);
		await setTengo(locals.user.id, id, tengo);
		return { ok: true };
	},

	changeRepetidas: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const delta = Number(data.get('delta') ?? 0);
		if (!id) return fail(400);
		await deltaRepetidas(locals.user.id, id, delta);
		return { ok: true };
	}
};
