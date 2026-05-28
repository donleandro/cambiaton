import { fail, redirect } from '@sveltejs/kit';
import {
	createSessionCookie,
	verifyPasswordLogin,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import {
	chequearRateLimit,
	registrarIntento,
	formateaEspera
} from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const ip = getClientAddress();

		const rate = await chequearRateLimit(ip);
		if (!rate.permitido) {
			return fail(429, {
				error: `Demasiados intentos. Probá de nuevo en ${formateaEspera(rate.bloqueadoPorMs)}.`
			});
		}

		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, error: 'Email y contraseña son requeridos.' });
		}

		const userId = await verifyPasswordLogin(email, password);
		await registrarIntento(ip, userId !== null);

		if (userId === null) {
			await new Promise((r) => setTimeout(r, 400));
			return fail(401, { email, error: 'Email o contraseña incorrecta.' });
		}

		const cookie = await createSessionCookie(userId);
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
