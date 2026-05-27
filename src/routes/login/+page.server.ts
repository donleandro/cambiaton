import { fail, redirect } from '@sveltejs/kit';
import {
	authEnabled,
	createSessionCookie,
	verifyPassword,
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
	if (!authEnabled()) throw redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const ip = getClientAddress();

		const rate = await chequearRateLimit(ip);
		if (!rate.permitido) {
			return fail(429, {
				error: `Demasiados intentos. Probá de nuevo en ${formateaEspera(rate.bloqueadoPorMs)}.`,
				bloqueado: true
			});
		}

		const data = await request.formData();
		const password = String(data.get('password') ?? '');

		const ok = await verifyPassword(password);
		await registrarIntento(ip, ok);

		if (!ok) {
			// Delay artificial para que un atacante no pueda hacer 1000 req/seg
			// (aunque el rate limit ya lo detendría antes)
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
