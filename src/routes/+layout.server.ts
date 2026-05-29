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

		// Stats agregados para enviar como user_properties a GA4. Un solo query.
		const [agg] = await db
			.select({
				total: sql<number>`(SELECT count(*) FROM ${stickers})`,
				tengo: sql<number>`COALESCE(SUM(CASE WHEN ${colecciones.tengo} = 1 THEN 1 ELSE 0 END), 0)`
			})
			.from(colecciones)
			.where(eq(colecciones.userId, locals.user.id));
		const tengo = Number(agg?.tengo ?? 0);
		const total = Number(agg?.total ?? 0);
		const pct = total > 0 ? (tengo / total) * 100 : 0;
		stats = { tengo, total, pct, bucket: pctBucket(pct) };
	}

	return {
		user: locals.user ?? null,
		pendientes,
		stats
	};
};
