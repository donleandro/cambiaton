import { redirect, type Handle } from '@sveltejs/kit';
import {
	authEnabled,
	verifySessionCookie,
	SESSION_COOKIE_NAME
} from '$lib/server/auth';

const RUTAS_PUBLICAS = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	if (!authEnabled()) {
		event.locals.authenticated = true;
		return resolve(event);
	}

	const cookie = event.cookies.get(SESSION_COOKIE_NAME);
	const ok = await verifySessionCookie(cookie);
	event.locals.authenticated = ok;

	const esPublica = RUTAS_PUBLICAS.some((p) => event.url.pathname.startsWith(p));
	if (!ok && !esPublica) {
		const redirectTo = event.url.pathname + event.url.search;
		throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTo)}`);
	}

	// Si ya estás logueado y caes en /login, mandate al destino o /
	if (ok && esPublica) {
		const target = event.url.searchParams.get('redirect') ?? '/';
		throw redirect(303, target);
	}

	return resolve(event);
};
