import type { LayoutServerLoad } from './$types';
import { authEnabled } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { imports } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Solo contar pendientes si el usuario está autenticado (o auth está off).
	// Las rutas públicas (/compartir) no necesitan este dato.
	let pendientes = 0;
	if (locals.authenticated) {
		const [{ n }] = await db
			.select({ n: sql<number>`count(*)` })
			.from(imports)
			.where(eq(imports.status, 'pendiente'));
		pendientes = Number(n);
	}

	return {
		authEnabled: authEnabled(),
		authenticated: locals.authenticated,
		pendientes
	};
};
