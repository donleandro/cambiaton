import QRCode from 'qrcode';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// url.origin se construye según la URL desde la que entraste:
	//  - dev local: http://localhost:5173
	//  - dev LAN:   http://192.168.x.y:5173 (si arrancás dev con --host)
	//  - prod:      https://tu-app.pages.dev (o tu dominio)
	const compartirUrl = `${url.origin}/compartir`;

	const qrSvg = await QRCode.toString(compartirUrl, {
		type: 'svg',
		margin: 1,
		width: 480,
		color: { dark: '#0c0a09', light: '#ffffff' }
	});

	const esLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';

	return { compartirUrl, qrSvg, esLocalhost };
};
