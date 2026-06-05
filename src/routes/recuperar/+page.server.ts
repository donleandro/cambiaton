import { fail, redirect } from '@sveltejs/kit';
import {
	verifyResetToken,
	setUserPassword,
	createSessionCookie,
	getUserById,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token') ?? '';
	const valid = await verifyResetToken(token);
	if (!valid) {
		return { valido: false as const };
	}
	const user = await getUserById(valid.userId);
	return {
		valido: true as const,
		token,
		nombre: user?.nombre ?? '',
		email: user?.email ?? null
	};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const token = String(data.get('token') ?? '');
		const password = String(data.get('password') ?? '');
		const password2 = String(data.get('password2') ?? '');

		// Revalidar el token en el submit: el de la carga pudo expirar mientras
		// la persona tipeaba, o haberse usado ya (hash cambió).
		const valid = await verifyResetToken(token);
		if (!valid) {
			return fail(400, {
				token,
				error: 'El enlace ya no es válido. Es probable que haya expirado o ya se haya usado. Pedí uno nuevo.'
			});
		}

		if (password.length < 6) {
			return fail(400, { token, error: 'La contraseña debe tener al menos 6 caracteres.' });
		}
		if (password !== password2) {
			return fail(400, { token, error: 'Las contraseñas no coinciden.' });
		}

		await setUserPassword(valid.userId, password);

		// Loguear automáticamente: la persona acaba de probar control sobre la
		// cuenta al setear la contraseña, así que la dejamos entrar directo.
		const cookie = await createSessionCookie(valid.userId);
		cookies.set(SESSION_COOKIE_NAME, cookie, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: SESSION_MAX_AGE,
			secure: !import.meta.env.DEV
		});

		throw redirect(303, '/');
	}
};
