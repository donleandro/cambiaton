import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { imports, colecciones, stickers } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';

function pctBucket(pct: number): string {
	if (pct >= 100) return '100';
	if (pct >= 75) return '75-99';
	if (pct >= 50) return '50-74';
	if (pct >= 25) return '25-49';
	if (pct > 0) return '1-24';
	return '0';
}

export const load: LayoutServerLoad = async ({ locals }) => {
	let pendientes = 0;
	let stats: { tengo: number; total: number; pct: number; bucket: string } | null = null;

	if (locals.user) {
		// Pendientes (badge en nav + intercambios).
		const [{ n }] = await db
			.select({ n: sql<number>`count(*)` })
			.from(imports)
			.where(and(eq(imports.toUserId, locals.user.id), eq(imports.status, 'pendiente')));
		pendientes = Number(n);

		// Stats agregados para user_properties GA4 — dos queries simples (más
		// robusto que un solo SQL con subquery, que rompía en D1 vía drizzle).
		const [{ total }] = await db
			.select({ total: sql<number>`count(*)` })
			.from(stickers);
		const [{ tengo }] = await db
			.select({ tengo: sql<number>`count(*)` })
			.from(colecciones)
			.where(and(eq(colecciones.userId, locals.user.id), eq(colecciones.tengo, true)));
		const t = Number(tengo ?? 0);
		const tot = Number(total ?? 0);
		const pct = tot > 0 ? (t / tot) * 100 : 0;
		stats = { tengo: t, total: tot, pct, bucket: pctBucket(pct) };
	}

	return {
		user: locals.user ?? null,
		pendientes,
		stats
	};
};
