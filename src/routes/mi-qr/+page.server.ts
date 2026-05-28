import QRCode from 'qrcode';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');

	// El QR lleva el token del receptor en la query: el submitter que escanea
	// el código entra a /compartir?to=<token>, su lista se asocia automáticamente
	// como propuesta de intercambio para ESTE usuario (no para el admin global).
	const compartirUrl = `${url.origin}/compartir?to=${locals.user.token}`;

	const qrSvg = await QRCode.toString(compartirUrl, {
		type: 'svg',
		margin: 1,
		width: 480,
		color: { dark: '#0c0a09', light: '#ffffff' }
	});

	const esLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

	return { compartirUrl, qrSvg, esLocalhost };
};
