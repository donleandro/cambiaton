import { fail, redirect } from '@sveltejs/kit';
import {
	createAnonymousUser,
	claimUser,
	createSessionCookie,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import { chequearLimite, registrarEvento, formateaEspera } from '$lib/server/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/');
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, url, getClientAddress }) => {
		const ip = getClientAddress();
		// Anti-abuso: máx 8 registros por IP cada 10 min (evita bots creando cuentas).
		const rl = await chequearLimite(ip, 'registro', 8, 10 * 60 * 1000);
		if (!rl.permitido) {
			return fail(429, {
				error: `Demasiados registros seguidos. Probá de nuevo en ${formateaEspera(rl.bloqueadoPorMs)}.`
			});
		}

		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!nombre || !email || !password) {
			return fail(400, { nombre, email, error: 'Todos los campos son requeridos.' });
		}

		await registrarEvento(ip, 'registro');
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

		// Después de crear cuenta vacía mandamos al onboarding /importar para que
		// la persona pegue su lista de Figuritas. Si vino con ?redirect= (caso
		// raro: ya tenía URL específica esperándolo), respetamos ese destino.
		throw redirect(303, url.searchParams.get('redirect') ?? '/importar');
	}
};
