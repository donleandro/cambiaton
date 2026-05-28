import { fail, redirect } from '@sveltejs/kit';
import { claimUser } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		// No hay sesión: mandamos a /login (no tenemos a quién reclamarle).
		const redirectTo = '/reclamar';
		throw redirect(303, `/login?redirect=${encodeURIComponent(redirectTo)}`);
	}
	if (locals.user.email) {
		// Ya tiene email — la cuenta ya está reclamada, mandamos al destino o home.
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
			// Idempotencia: ya está reclamada.
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

		// La sesión actual ya apunta al mismo userId, así que sigue válida.
		throw redirect(303, url.searchParams.get('redirect') ?? '/');
	}
};
