import { db } from '$lib/server/db';
import { stickers, imports } from '$lib/server/db/schema';
import { parseInventario } from '$lib/server/matcher';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		const faltantesTexto = String(data.get('faltantes') ?? '');
		const repetidasTexto = String(data.get('repetidas') ?? '');

		if (!nombre) {
			return fail(400, {
				nombre,
				faltantesTexto,
				repetidasTexto,
				error: 'Decinos tu nombre o referencia para identificar este envío.'
			});
		}

		const catalogo = await db.select().from(stickers);
		const faltantesParsed = parseInventario(faltantesTexto, catalogo);
		const repetidasParsed = parseInventario(repetidasTexto, catalogo);

		if (faltantesParsed.length === 0 && repetidasParsed.length === 0) {
			return fail(400, {
				nombre,
				faltantesTexto,
				repetidasTexto,
				error: 'No se reconoció ningún sticker. Revisá el formato.'
			});
		}

		const [{ id }] = await db
			.insert(imports)
			.values({
				nombre,
				origen: 'publico',
				payload: {
					faltantes: faltantesParsed.map((f) => f.id),
					repetidas: repetidasParsed
				}
			})
			.returning({ id: imports.id });

		throw redirect(303, `/compartir/exito/${id}`);
	}
};
