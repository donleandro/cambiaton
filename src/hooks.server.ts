import { redirect, type Handle } from '@sveltejs/kit';
import { verifySessionCookie, getUserById, SESSION_COOKIE_NAME } from '$lib/server/auth';
import { runWithD1 } from '$lib/server/db';

const RUTAS_PUBLICAS = ['/login', '/registro', '/reclamar', '/compartir'];

export const handle: Handle = async ({ event, resolve }) => {
	// Forzar host canónico. Sólo aplica al `cambiaton.pages.dev` literal — las
	// preview URLs (xxxxxxxx.cambiaton.pages.dev) y localhost se dejan pasar.
	const canonical = event.platform?.env.CANONICAL_HOST;
	if (canonical && event.url.hostname === 'cambiaton.pages.dev') {
		const target = new URL(event.url);
		target.hostname = canonical;
		target.port = '';
		throw redirect(308, target.toString());
	}

	const d1 = event.platform?.env.DB;
	if (!d1) {
		throw new Error(
			'D1 binding "DB" no disponible. Localmente: corré con `wrangler pages dev` o `vite dev` con platformProxy habilitado en svelte.config.js.'
		);
	}

	// Exponer secrets de platform.env como process.env para `$env/dynamic/private`
	// (workerd no tiene process.env real, pero adapter-cloudflare lo expone si están bindeados).
	return runWithD1(d1, async () => {
		const cookie = event.cookies.get(SESSION_COOKIE_NAME);
		const session = await verifySessionCookie(cookie);

		if (session) {
			const user = await getUserById(session.userId);
			if (user) {
				event.locals.user = {
					id: user.id,
					nombre: user.nombre,
					email: user.email,
					isAdmin: user.isAdmin,
					token: user.token
				};
			}
		}

		const esPublica = RUTAS_PUBLICAS.some((p) => event.url.pathname.startsWith(p));
		const autenticado = !!event.locals.user;

		if (!autenticado && !esPublica) {
			const redirectTo = event.url.pathname + event.url.search;
			throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTo)}`);
		}

		// Logueado en /login → al destino o /
		if (autenticado && event.url.pathname === '/login') {
			const target = event.url.searchParams.get('redirect') ?? '/';
			throw redirect(303, target);
		}

		return resolve(event);
	});
};
