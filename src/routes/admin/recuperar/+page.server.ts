import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { asc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { createResetToken, getUserById } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

// Esta ruta puede resetear la contraseña de CUALQUIER cuenta, así que la
// clavamos al único admin (vos). No alcanza con is_admin=1: pinneamos el email.
const ADMIN_EMAIL = '123857@gmail.com';
function esAdminUnico(user: App.Locals['user']): boolean {
	return !!user?.isAdmin && user.email?.toLowerCase() === ADMIN_EMAIL;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');
	if (!esAdminUnico(locals.user)) throw error(403, 'Solo admin');

	const lista = await db
		.select({ id: users.id, nombre: users.nombre, email: users.email })
		.from(users)
		.orderBy(asc(users.nombre));

	return { usuarios: lista };
};

export const actions: Actions = {
	generar: async ({ request, locals, url }) => {
		if (!esAdminUnico(locals.user)) return fail(403, { error: 'Solo admin' });

		const data = await request.formData();
		const userId = Number(data.get('userId'));
		const ttlMin = Number(data.get('ttl') ?? 60);
		if (!Number.isFinite(userId) || userId <= 0) {
			return fail(400, { error: 'Elegí una cuenta válida.' });
		}

		const user = await getUserById(userId);
		if (!user) return fail(404, { error: 'No existe esa cuenta.' });

		const ttlMs = (Number.isFinite(ttlMin) && ttlMin > 0 ? ttlMin : 60) * 60 * 1000;
		const token = await createResetToken(userId, ttlMs);
		if (!token) return fail(500, { error: 'No se pudo generar el enlace.' });

		const link = `${url.origin}/recuperar?token=${token}`;
		const expira = new Date(Date.now() + ttlMs).toISOString();

		return {
			ok: true,
			link,
			nombre: user.nombre,
			email: user.email,
			expira,
			ttlMin: ttlMs / 60000
		};
	}
};
