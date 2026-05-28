import { redirect, type Handle } from '@sveltejs/kit';
import { verifySessionCookie, getUserById, SESSION_COOKIE_NAME } from '$lib/server/auth';

const RUTAS_PUBLICAS = ['/login', '/registro', '/reclamar', '/compartir'];

export const handle: Handle = async ({ event, resolve }) => {
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
};
