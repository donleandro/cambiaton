import { db } from '$lib/server/db';
import { stickers, imports } from '$lib/server/db/schema';
import { grupoDe } from '$lib/server/groups';
import { calcularMatch, type InventarioAjeno } from '$lib/server/matcher';
import { eq, inArray, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const importId = Number(params.id);
	if (!Number.isInteger(importId)) throw error(400, 'Import inválido');

	const [imp] = await db.select().from(imports).where(eq(imports.id, importId));
	if (!imp) throw error(404, 'Import no encontrado');

	const all = await db.select().from(stickers);
	const ajeno = imp.payload as InventarioAjeno;
	const match = calcularMatch(all, ajeno);

	const enrich = (items: typeof match.doy) =>
		items.map((it) => ({ ...it, grupo: grupoDe(it.equipo) }));

	return {
		importacion: {
			id: imp.id,
			nombre: imp.nombre,
			fecha: imp.fecha,
			status: imp.status,
			origen: imp.origen
		},
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
	confirmar: async ({ request, params }) => {
		const importId = Number(params.id);
		if (!Number.isInteger(importId)) return fail(400, { error: 'ID inválido' });

		const data = await request.formData();
		const dadosRaw = String(data.get('dados') ?? '');
		const recibidosRaw = String(data.get('recibidos') ?? '');
		const dados = dadosRaw ? dadosRaw.split(',').filter(Boolean) : [];
		const recibidos = recibidosRaw ? recibidosRaw.split(',').filter(Boolean) : [];

		if (dados.length === 0 && recibidos.length === 0) {
			return fail(400, { error: 'Seleccioná al menos un sticker.' });
		}

		// DADOS: -1 repetidas (cap 0)
		if (dados.length > 0) {
			await db
				.update(stickers)
				.set({ repetidas: sql`max(0, ${stickers.repetidas} - 1)` })
				.where(inArray(stickers.id, dados));
		}

		// RECIBIDOS: tengo=true
		if (recibidos.length > 0) {
			await db.update(stickers).set({ tengo: true }).where(inArray(stickers.id, recibidos));
		}

		// Marcar el import como aplicado para no contarlo más en pendientes
		await db
			.update(imports)
			.set({ status: 'aplicado' })
			.where(eq(imports.id, importId));

		return { ok: true, dados: dados.length, recibidos: recibidos.length };
	},

	archivar: async ({ params }) => {
		const importId = Number(params.id);
		if (!Number.isInteger(importId)) return fail(400, { error: 'ID inválido' });
		await db
			.update(imports)
			.set({ status: 'archivado' })
			.where(eq(imports.id, importId));
		throw redirect(303, '/intercambios');
	},

	reactivar: async ({ params }) => {
		const importId = Number(params.id);
		if (!Number.isInteger(importId)) return fail(400, { error: 'ID inválido' });
		await db
			.update(imports)
			.set({ status: 'pendiente' })
			.where(eq(imports.id, importId));
		return { ok: true };
	}
};
