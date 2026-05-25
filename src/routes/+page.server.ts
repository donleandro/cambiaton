import { db } from '$lib/server/db';
import { stickers } from '$lib/server/db/schema';
import { grupoDe } from '$lib/server/groups';
import { eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const all = await db.select().from(stickers).orderBy(stickers.equipo, stickers.numero);

	const enriched = all.map((s) => ({ ...s, grupo: grupoDe(s.equipo) }));

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
		confederaciones
	};
};

export const actions: Actions = {
	toggleTengo: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const tengo = data.get('tengo') === 'true';
		if (!id) return fail(400, { message: 'id requerido' });
		await db.update(stickers).set({ tengo }).where(eq(stickers.id, id));
		return { ok: true };
	},

	changeRepetidas: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const delta = Number(data.get('delta') ?? 0);
		if (!id) return fail(400, { message: 'id requerido' });
		// No incrementar repetidas si todavía no se tiene el sticker.
		// Prioridad: que vaya al álbum primero. Decrementos siempre permitidos
		// (capean en 0 vía SQL).
		const condicion = delta > 0 ? sql`${stickers.id} = ${id} AND ${stickers.tengo} = 1` : eq(stickers.id, id);
		await db
			.update(stickers)
			.set({ repetidas: sql`max(0, ${stickers.repetidas} + ${delta})` })
			.where(condicion);
		return { ok: true };
	},

	setRepetidas: async ({ request }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const value = Math.max(0, Number(data.get('value') ?? 0));
		if (!id) return fail(400, { message: 'id requerido' });
		await db.update(stickers).set({ repetidas: value }).where(eq(stickers.id, id));
		return { ok: true };
	}
};
