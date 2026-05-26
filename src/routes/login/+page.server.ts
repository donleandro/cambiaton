import { fail, redirect } from '@sveltejs/kit';
import {
	authEnabled,
	createSessionCookie,
	verifyPassword,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	if (!authEnabled()) throw redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const password = String(data.get('password') ?? '');

		if (!(await verifyPassword(password))) {
			// Pequeño delay anti-fuerza-bruta (no es robusto pero suma fricción)
			await new Promise((r) => setTimeout(r, 400));
			return fail(401, { error: 'Contraseña incorrecta' });
		}

		const cookie = await createSessionCookie();
		cookies.set(SESSION_COOKIE_NAME, cookie, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE,
			secure: !import.meta.env.DEV
		});

		const target = url.searchParams.get('redirect') ?? '/';
		throw redirect(303, target);
	}
};
