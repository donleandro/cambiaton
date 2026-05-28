import type { LayoutServerLoad } from './$types';
import { db } from '$lib/server/db';
import { imports } from '$lib/server/db/schema';
import { and, eq, sql } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	let pendientes = 0;
	if (locals.user) {
		const [{ n }] = await db
			.select({ n: sql<number>`count(*)` })
			.from(imports)
			.where(and(eq(imports.toUserId, locals.user.id), eq(imports.status, 'pendiente')));
		pendientes = Number(n);
	}

	return {
		user: locals.user ?? null,
		pendientes
	};
};
