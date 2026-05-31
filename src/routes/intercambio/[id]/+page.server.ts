import { db } from '$lib/server/db';
import { imports, users } from '$lib/server/db/schema';
import { grupoDe } from '$lib/server/groups';
import { calcularMatch, type InventarioAjeno } from '$lib/server/matcher';
import {
	getColeccionCompleta,
	setTengo,
	deltaRepetidas,
	registrarIntercambio
} from '$lib/server/collection';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) throw error(401, 'No autenticado');
	const importId = Number(params.id);
	if (!Number.isInteger(importId)) throw error(400, 'Import inválido');

	const [imp] = await db.select().from(imports).where(eq(imports.id, importId));
	if (!imp) throw error(404, 'Import no encontrado');
	if (imp.toUserId !== locals.user.id) throw error(403, 'No es tu intercambio');

	const [submitter] = await db.select().from(users).where(eq(users.id, imp.submitterId));
	if (!submitter) throw error(404, 'Submitter no encontrado');

	const miColeccion = await getColeccionCompleta(locals.user.id);
	const suColeccion = await getColeccionCompleta(submitter.id);

	const inventarioAjeno: InventarioAjeno = {
		faltantes: suColeccion.filter((s) => !s.tengo).map((s) => s.id),
		repetidas: suColeccion
			.filter((s) => s.repetidas > 0)
			.map((s) => ({ id: s.id, count: s.repetidas }))
	};

	const match = calcularMatch(miColeccion, inventarioAjeno);

	const enrich = (items: typeof match.doy) =>
		items.map((it) => ({ ...it, grupo: grupoDe(it.equipo) }));

	// Si el submitter sigue siendo anónimo, generamos un link + QR para que el
	// receiver se lo pase y pueda registrarse manteniendo su colección.
	let registroLink: string | null = null;
	let registroQrSvg: string | null = null;
	if (!submitter.email) {
		registroLink = `${url.origin}/reclamar?token=${submitter.token}`;
		registroQrSvg = await QRCode.toString(registroLink, {
			type: 'svg',
			margin: 1,
			width: 320,
			color: { dark: '#0c0a09', light: '#ffffff' }
		});
	}

	return {
		importacion: {
			id: imp.id,
			nombre: submitter.nombre,
			fecha: imp.fecha,
			status: imp.status,
			origen: imp.origen,
			submitterId: submitter.id,
			submitterAnon: !submitter.email
		},
		registroLink,
		registroQrSvg,
		match: {
			doy: enrich(match.doy),
			recibo: enrich(match.recibo),
			balanceado: match.balanceado
		},
		totales: {
			doy: match.doy.reduce((a, b) => a + b.cantidad, 0),
			recibo: match.recibo.reduce((a, b) => a + b.cantidad, 0)
		}
	};
};

export const actions: Actions = {
	confirmar: async ({ request, params, locals }) => {
		if (!locals.user) return fail(401);
		const importId = Number(params.id);
		if (!Number.isInteger(importId)) return fail(400);

		const [imp] = await db.select().from(imports).where(eq(imports.id, importId));
		if (!imp || imp.toUserId !== locals.user.id) return fail(403);

		const data = await request.formData();
		const dados = String(data.get('dados') ?? '')
			.split(',')
			.filter(Boolean);
		const recibidos = String(data.get('recibidos') ?? '')
			.split(',')
			.filter(Boolean);

		// La transferencia es siempre 1 a 1: misma cantidad de cada lado.
		if (dados.length > 0 && recibidos.length > 0 && dados.length !== recibidos.length) {
			return fail(400, {
				error: `El cambio tiene que ser 1 a 1: ${dados.length} para dar vs ${recibidos.length} para recibir.`
			});
		}

		if (dados.length === 0 && recibidos.length === 0) {
			return fail(400, { error: 'Seleccioná al menos un sticker.' });
		}

		// Registrar el LOG (bilateral): guardamos la contraparte como usuario para
		// poder revertir su lado si después se ajusta/anula.
		const [submitter] = await db
			.select({ nombre: users.nombre })
			.from(users)
			.where(eq(users.id, imp.submitterId));
		await registrarIntercambio({
			userId: locals.user.id,
			dados,
			recibidos,
			contraparte: submitter?.nombre ?? null,
			contraparteUserId: imp.submitterId,
			inicio: 'lista-compartida'
		});

		// DADOS (mis repetidas → del submitter): -1 a mí, +tengo o +1 repetida al submitter
		for (const id of dados) {
			await deltaRepetidas(locals.user.id, id, -1);
			// El submitter ahora tiene este sticker
			await setTengo(imp.submitterId, id, true);
		}
		// RECIBIDOS (sus repetidas → a mí): +tengo a mí, -1 al submitter
		for (const id of recibidos) {
			await setTengo(locals.user.id, id, true);
			await deltaRepetidas(imp.submitterId, id, -1);
		}

		await db.update(imports).set({ status: 'aplicado' }).where(eq(imports.id, importId));
		return { ok: true, dados: dados.length, recibidos: recibidos.length };
	},

	archivar: async ({ params, locals }) => {
		if (!locals.user) return fail(401);
		const importId = Number(params.id);
		if (!Number.isInteger(importId)) return fail(400);
		await db.update(imports).set({ status: 'archivado' }).where(eq(imports.id, importId));
		throw redirect(303, '/intercambios');
	},

	reactivar: async ({ params, locals }) => {
		if (!locals.user) return fail(401);
		const importId = Number(params.id);
		if (!Number.isInteger(importId)) return fail(400);
		await db.update(imports).set({ status: 'pendiente' }).where(eq(imports.id, importId));
		return { ok: true };
	}
};
