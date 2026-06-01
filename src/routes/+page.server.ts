import {
	getColeccionCompleta,
	aplicarAtomico,
	legs,
	estaBloqueado,
	setCandadoEquipo
} from '$lib/server/collection';
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
		needsClaim: !locals.user.email,
		coleccionVacia: tengo === 0 && repetidasTotal === 0
	};
};

export const actions: Actions = {
	toggleTengo: async ({ request, locals, getClientAddress }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const tengo = data.get('tengo') === 'true';
		const opId = String(data.get('opId') ?? '').trim() || null;
		if (!id) return fail(400);
		// Candado: si está protegido, no se puede desmarcar (sí volver a marcar).
		if (!tengo && (await estaBloqueado(locals.user.id, id))) {
			return fail(423, {
				error: 'Ese sticker está con candado 🔒. Abrí el candado del equipo para desmarcarlo.'
			});
		}
		const res = await aplicarAtomico({
			opId,
			userId: locals.user.id,
			kind: 'toggle',
			payload: { id, tengo },
			ctx: { ip: getClientAddress?.() ?? null, userAgent: request.headers.get('user-agent') },
			legs: [legs.setTengo(locals.user.id, id, tengo)]
		});
		return { ok: true, duplicado: res.duplicado };
	},

	changeRepetidas: async ({ request, locals, getClientAddress }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const delta = Number(data.get('delta') ?? 0);
		const opId = String(data.get('opId') ?? '').trim() || null;
		if (!id) return fail(400);
		if (!Number.isFinite(delta) || delta === 0) return fail(400);
		// Idempotente: con opId, un mismo click reenviado (doble-tap, reintento de
		// red, replay offline) se aplica UNA sola vez. Esto es lo que evita el "x4".
		const res = await aplicarAtomico({
			opId,
			userId: locals.user.id,
			kind: 'repetidas',
			payload: { id, delta },
			ctx: { ip: getClientAddress?.() ?? null, userAgent: request.headers.get('user-agent') },
			legs: [legs.deltaRepetidas(locals.user.id, id, delta)]
		});
		return { ok: true, duplicado: res.duplicado };
	},

	// Cerrar / abrir el candado de un equipo entero (protege el "lo tengo").
	candadoEquipo: async ({ request, locals }) => {
		if (!locals.user) return fail(401);
		const data = await request.formData();
		const equipo = String(data.get('equipo') ?? '').trim();
		const bloquear = data.get('bloquear') === 'true';
		if (!equipo) return fail(400);
		const afectados = await setCandadoEquipo(locals.user.id, equipo, bloquear);
		return { ok: true, equipo, bloqueado: bloquear, afectados };
	}
};
