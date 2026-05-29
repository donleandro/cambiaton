import { db } from '$lib/server/db';
import { stickers, colecciones } from '$lib/server/db/schema';
import { parseInventario } from '$lib/server/matcher';
import { eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');
	const filas = await db
		.select({ tengo: colecciones.tengo, repetidas: colecciones.repetidas })
		.from(colecciones)
		.where(eq(colecciones.userId, locals.user.id));
	const tengo = filas.filter((f) => f.tengo).length;
	const repetidas = filas.reduce((a, f) => a + f.repetidas, 0);
	return {
		user: locals.user,
		tieneData: tengo > 0 || repetidas > 0,
		tengo,
		repetidas
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) throw error(401, 'No autenticado');

		const data = await request.formData();
		const faltantesTexto = String(data.get('faltantes') ?? '');
		const repetidasTexto = String(data.get('repetidas') ?? '');
		const reemplazar = data.get('reemplazar') === '1';

		const catalogo = await db.select().from(stickers);
		const faltantesParsed = parseInventario(faltantesTexto, catalogo);
		const repetidasParsed = parseInventario(repetidasTexto, catalogo);

		if (faltantesParsed.length === 0 && repetidasParsed.length === 0) {
			return fail(400, {
				faltantesTexto,
				repetidasTexto,
				error:
					'No se reconoció ningún sticker. Pegá tu lista de Figuritas — por ejemplo "MEX 🇲🇽: 4, 5, 6".'
			});
		}

		// Reglas para derivar la colección:
		//   - sticker en lista de faltantes → tengo=false
		//   - sticker en lista de repetidas → tengo=true, repetidas=count
		//   - sticker que no está en ninguna lista pero está en el catálogo:
		//       - si reemplazar=true → tengo=true, repetidas=0
		//       - si reemplazar=false (default) → no tocamos
		const faltantesSet = new Set(faltantesParsed.map((f) => f.id));
		const repetidasMap = new Map(repetidasParsed.map((r) => [r.id, r.count]));

		// Para reemplazar limpiamos la colección actual primero. Es destructivo
		// pero es lo que el form deja claro (checkbox).
		if (reemplazar) {
			await db.delete(colecciones).where(eq(colecciones.userId, locals.user.id));
		}

		const filas: { userId: number; stickerId: string; tengo: boolean; repetidas: number }[] = [];
		for (const s of catalogo) {
			if (faltantesSet.has(s.id)) {
				filas.push({ userId: locals.user.id, stickerId: s.id, tengo: false, repetidas: 0 });
			} else if (repetidasMap.has(s.id)) {
				filas.push({
					userId: locals.user.id,
					stickerId: s.id,
					tengo: true,
					repetidas: repetidasMap.get(s.id)!
				});
			} else if (reemplazar) {
				// El asume-todo-lo-no-listado-está-en-mi-album sólo aplica cuando el
				// usuario marcó "reemplazar". Si no, dejamos la fila existente como esté.
				filas.push({ userId: locals.user.id, stickerId: s.id, tengo: true, repetidas: 0 });
			}
		}

		if (filas.length === 0) {
			return fail(400, {
				faltantesTexto,
				repetidasTexto,
				error: 'No identificamos nada para importar. Revisá el formato.'
			});
		}

		// D1 limita ~100 bound parameters por query — 4 cols por fila → batch 20.
		const BATCH = 20;
		try {
			for (let i = 0; i < filas.length; i += BATCH) {
				await db
					.insert(colecciones)
					.values(filas.slice(i, i + BATCH))
					.onConflictDoUpdate({
						target: [colecciones.userId, colecciones.stickerId],
						set: {
							tengo: sqlVarRef('tengo'),
							repetidas: sqlVarRef('repetidas')
						}
					});
			}
		} catch (e) {
			console.error('[importar] insert colecciones falló:', e);
			return fail(500, {
				faltantesTexto,
				repetidasTexto,
				error: 'No pudimos guardar tu colección. ' + (e instanceof Error ? e.message : String(e))
			});
		}

		throw redirect(303, '/?importado=1');
	}
};

// Helper drizzle: referenciar la columna "excluded" en un ON CONFLICT.
import { sql } from 'drizzle-orm';
function sqlVarRef(col: 'tengo' | 'repetidas') {
	return sql.raw(`excluded.${col}`);
}
