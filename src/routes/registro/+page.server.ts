import { fail, redirect } from '@sveltejs/kit';
import {
	createAnonymousUser,
	claimUser,
	createSessionCookie,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!nombre || !email || !password) {
			return fail(400, { nombre, email, error: 'Todos los campos son requeridos.' });
		}

		const user = await createAnonymousUser(nombre);
		const result = await claimUser(user.id, email, password, nombre);
		if (!result.ok) {
			return fail(400, { nombre, email, error: result.error });
		}

		const cookie = await createSessionCookie(user.id);
		cookies.set(SESSION_COOKIE_NAME, cookie, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE,
			secure: !import.meta.env.DEV
		});

		throw redirect(303, url.searchParams.get('redirect') ?? '/');
	}
};
