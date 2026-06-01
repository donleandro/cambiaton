import { getColeccionCompleta, aplicarAtomico, legs } from '$lib/server/collection';
import { intercambios } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
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
	confirmar: async ({ request, locals, getClientAddress }) => {
		if (!locals.user) return fail(401, { error: 'No autenticado' });
		const data = await request.formData();
		const dados = String(data.get('dados') ?? '')
			.split(',')
			.filter(Boolean);
		const recibidos = String(data.get('recibidos') ?? '')
			.split(',')
			.filter(Boolean);
		const contraparte = String(data.get('contraparte') ?? '').trim() || null;
		const inicio = String(data.get('inicio') ?? '').trim() || null;
		const opId = String(data.get('opId') ?? '').trim() || null;

		if (dados.length === 0 && recibidos.length === 0) {
			return fail(400, { error: 'No seleccionaste nada para intercambiar.' });
		}
		// La transferencia es siempre 1 a 1: misma cantidad de cada lado.
		if (dados.length !== recibidos.length) {
			return fail(400, {
				error: `El cambio tiene que ser 1 a 1: marcaste ${dados.length} para dar y ${recibidos.length} para recibir.`
			});
		}

		const ctx = {
			ip: getClientAddress?.() ?? null,
			userAgent: request.headers.get('user-agent')
		};
		const uid = locals.user.id;

		// Todo en una sola transacción atómica e idempotente: el asiento de la
		// bitácora (con opId UNIQUE) + el registro del intercambio + las mutaciones.
		// Si el opId ya existía (replay de la cola offline / doble-tap) nada se
		// re-aplica.
		const res = await aplicarAtomico({
			opId,
			userId: uid,
			kind: 'cambiaton',
			payload: { dados, recibidos, contraparte, inicio },
			ctx,
			legs: [
				db.insert(intercambios).values({
					userId: uid,
					dados,
					recibidos,
					contraparte,
					inicio,
					opId
				}),
				// DADOS: -1 repetida en mi colección
				...dados.map((id) => legs.deltaRepetidas(uid, id, -1)),
				// RECIBIDOS: tengo = true
				...recibidos.map((id) => legs.setTengo(uid, id, true))
			]
		});

		if (res.duplicado) {
			return { ok: true, dados: dados.length, recibidos: recibidos.length, duplicado: true };
		}
		return { ok: true, dados: dados.length, recibidos: recibidos.length };
	}
};
