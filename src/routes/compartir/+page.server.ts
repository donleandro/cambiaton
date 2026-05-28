import { db } from '$lib/server/db';
import { stickers, imports, colecciones, users } from '$lib/server/db/schema';
import { parseInventario } from '$lib/server/matcher';
import { createAnonymousUser } from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Para el v1, todos los submits van al admin (user 1). Después podemos
	// permitir elegir destinatario.
	return {};
};

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

		// 1. Crear usuario anónimo
		const user = await createAnonymousUser(nombre);

		// 2. Derivar su colección:
		//    - Si está en faltantes → tengo=false, repetidas=0 (NO insertamos fila)
		//    - Si está en repetidas → tengo=true, repetidas=count
		//    - Cualquier otro sticker del catálogo → tengo=true, repetidas=0
		const faltantesSet = new Set(faltantesParsed.map((f) => f.id));
		const repetidasMap = new Map(repetidasParsed.map((r) => [r.id, r.count]));

		const filasColeccion = [];
		for (const s of catalogo) {
			if (faltantesSet.has(s.id)) continue; // tengo=false implícito vía LEFT JOIN
			if (repetidasMap.has(s.id)) {
				filasColeccion.push({
					userId: user.id,
					stickerId: s.id,
					tengo: true,
					repetidas: repetidasMap.get(s.id)!
				});
			} else {
				filasColeccion.push({
					userId: user.id,
					stickerId: s.id,
					tengo: true,
					repetidas: 0
				});
			}
		}
		if (filasColeccion.length > 0) {
			// Batch insert
			for (let i = 0; i < filasColeccion.length; i += 100) {
				await db.insert(colecciones).values(filasColeccion.slice(i, i + 100));
			}
		}

		// 3. Buscar al admin (destinatario por defecto del v1)
		const [admin] = await db.select({ id: users.id }).from(users).where(eq(users.isAdmin, true)).limit(1);
		const toUserId = admin?.id ?? 1;

		// 4. Crear el import (proposal de swap)
		const [imp] = await db
			.insert(imports)
			.values({
				submitterId: user.id,
				toUserId,
				origen: 'publico'
			})
			.returning({ id: imports.id });

		throw redirect(303, `/compartir/exito/${imp.id}?token=${user.token}`);
	}
};
