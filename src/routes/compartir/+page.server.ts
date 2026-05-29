import { db } from '$lib/server/db';
import { stickers, imports, colecciones, users } from '$lib/server/db/schema';
import { parseInventario } from '$lib/server/matcher';
import {
	createAnonymousUser,
	createSessionCookie,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

async function resolverDestinatario(
	toToken: string | null
): Promise<{ id: number; nombre: string } | null> {
	if (!toToken) return null;
	const [u] = await db
		.select({ id: users.id, nombre: users.nombre })
		.from(users)
		.where(eq(users.token, toToken))
		.limit(1);
	return u ?? null;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const toToken = url.searchParams.get('to');
	const destinatario = await resolverDestinatario(toToken);
	const tokenInvalido = !!toToken && !destinatario;
	const aSiMismo = !!destinatario && destinatario.id === locals.user?.id;
	return {
		user: locals.user,
		destinatario,
		tokenInvalido,
		aSiMismo
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals, url }) => {
		const toToken = url.searchParams.get('to');

		// Sin token no hay con quién emparejar. Cortamos acá antes de tocar nada.
		const destinatario = await resolverDestinatario(toToken);
		if (!destinatario) {
			return fail(400, {
				error: toToken
					? 'El link es inválido o el destinatario ya no existe. Pedíle al dueño que te mande su link de nuevo.'
					: 'Este formulario necesita un link personalizado para saber con quién emparejarte.'
			});
		}

		const data = await request.formData();
		const nombre = String(data.get('nombre') ?? '').trim();
		const faltantesTexto = String(data.get('faltantes') ?? '');
		const repetidasTexto = String(data.get('repetidas') ?? '');

		// Si el visitor ya estaba logueado y el destinatario sos vos mismo, no
		// tiene sentido emparejar.
		if (locals.user && destinatario.id === locals.user.id) {
			return fail(400, {
				nombre,
				faltantesTexto,
				repetidasTexto,
				error: 'No podés emparejarte con vos mismo. Pedíle el link a otra persona.'
			});
		}

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
			// D1 limita ~100 bound parameters por query. 4 columnas → máx 25 filas/batch.
			const BATCH = 20;
			try {
				for (let i = 0; i < filasColeccion.length; i += BATCH) {
					await db.insert(colecciones).values(filasColeccion.slice(i, i + BATCH));
				}
			} catch (e) {
				console.error('[compartir] insert colecciones falló:', e);
				return fail(500, {
					nombre,
					faltantesTexto,
					repetidasTexto,
					error: 'No pudimos guardar tu colección. ' + (e instanceof Error ? e.message : String(e))
				});
			}
		}

		// 3. Crear el import (proposal de swap). Destinatario ya resuelto arriba.
		const [imp] = await db
			.insert(imports)
			.values({
				submitterId: user.id,
				toUserId: destinatario.id,
				origen: 'publico'
			})
			.returning({ id: imports.id });

		// Auto-login del submitter solo si no había sesión previa. Así puede volver
		// y reclamar su cuenta con email+password sin guardarse el link. Si ya
		// estaba logueado (admin compartiendo lista de un amigo), no le pisamos la
		// sesión.
		if (!locals.user) {
			const cookie = await createSessionCookie(user.id);
			cookies.set(SESSION_COOKIE_NAME, cookie, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: SESSION_MAX_AGE,
				secure: !import.meta.env.DEV
			});
		}

		throw redirect(303, `/compartir/exito/${imp.id}?token=${user.token}`);
	}
};
