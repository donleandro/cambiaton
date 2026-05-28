import { fail, redirect } from '@sveltejs/kit';
import {
	claimUser,
	createSessionCookie,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const queryToken = url.searchParams.get('token');

	// Autologin por token: si el visitante llega sin sesión pero con un token
	// que corresponde a un usuario anónimo (sin email), le seteamos cookie y
	// recargamos sin el token en la URL para no exponerlo.
	if (queryToken && !locals.user) {
		const [u] = await db.select().from(users).where(eq(users.token, queryToken)).limit(1);
		if (u && !u.email) {
			const cookie = await createSessionCookie(u.id);
			cookies.set(SESSION_COOKIE_NAME, cookie, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: SESSION_MAX_AGE,
				secure: !import.meta.env.DEV
			});
			const clean = new URL(url);
			clean.searchParams.delete('token');
			throw redirect(303, clean.pathname + clean.search);
		}
		if (u && u.email) {
			// La cuenta ya fue reclamada — mandamos a login normal.
			throw redirect(
				303,
				`/login?redirect=${encodeURIComponent(url.searchParams.get('redirect') ?? '/')}`
			);
		}
		// Token inválido: caemos al chequeo estándar.
	}

	if (!locals.user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent('/reclamar')}`);
	}
	if (locals.user.email) {
		throw redirect(303, url.searchParams.get('redirect') ?? '/');
	}
	return { user: locals.user };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}
		if (locals.user.email) {
			throw redirect(303, url.searchParams.get('redirect') ?? '/');
		}

		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const nombre = String(data.get('nombre') ?? '').trim() || locals.user.nombre;

		if (!email || !password) {
			return fail(400, { email, error: 'Email y contraseña son requeridos.' });
		}

		const result = await claimUser(locals.user.id, email, password, nombre);
		if (!result.ok) {
			return fail(400, { email, error: result.error });
		}

		throw redirect(303, url.searchParams.get('redirect') ?? '/');
	}
};
