import { db } from '$lib/server/db';
import { stickers, imports, colecciones, users } from '$lib/server/db/schema';
import { parseInventario } from '$lib/server/matcher';
import {
	createAnonymousUser,
	createSessionCookie,
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE
} from '$lib/server/auth';
import { chequearLimite, registrarEvento } from '$lib/server/rate-limit';
import { and, eq, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

async function resolverPorToken(
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
	const porToken = await resolverPorToken(toToken);

	const destinatario = porToken ?? (locals.user ? { id: locals.user.id, nombre: locals.user.nombre } : null);
	const tokenInvalido = !!toToken && !porToken;
	const aSiMismo = !!porToken && porToken.id === locals.user?.id;

	// ¿El visitor logueado ya tiene colección cargada? Si la tiene y está
	// llegando vía QR de OTRO (no aSiMismo), podemos ofrecerle mandar su data
	// actual en un click — sin re-pegar la lista. El query ?modo=pegar fuerza
	// el form aunque haya data (para el caso "cargo lista que me dictaron").
	let tieneDataPropia = false;
	const forzarPegar = url.searchParams.get('modo') === 'pegar';
	if (!forzarPegar && locals.user && porToken && !aSiMismo) {
		const [{ n }] = await db
			.select({ n: sql<number>`count(*)` })
			.from(colecciones)
			.where(
				and(
					eq(colecciones.userId, locals.user.id),
					sql`(${colecciones.tengo} = 1 OR ${colecciones.repetidas} > 0)`
				)
			);
		tieneDataPropia = Number(n) > 0;
	}

	return {
		user: locals.user,
		destinatario,
		tokenInvalido,
		aSiMismo,
		tieneDataPropia
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals, url, getClientAddress }) => {
		const toToken = url.searchParams.get('to');
		const porToken = await resolverPorToken(toToken);

		// Resolver destinatario con las mismas reglas que el load:
		//   token válido → ese user; sin token + logueado → vos mismo; sin token
		//   + anónimo → cortamos.
		const destinatario =
			porToken ?? (locals.user ? { id: locals.user.id, nombre: locals.user.nombre } : null);

		if (!destinatario) {
			return fail(400, {
				error: toToken
					? 'El link es inválido o el destinatario ya no existe. Pedíle al dueño que te mande su link de nuevo.'
					: 'Este formulario necesita un link personalizado para saber con quién emparejarte.'
			});
		}

		const data = await request.formData();
		const modo = String(data.get('modo') ?? 'pegar');
		const nombre = String(data.get('nombre') ?? '').trim();
		const faltantesTexto = String(data.get('faltantes') ?? '');
		const repetidasTexto = String(data.get('repetidas') ?? '');

		// Si el visitor explícitamente pidió emparejarse consigo mismo vía token,
		// no tiene sentido.
		if (porToken && locals.user && porToken.id === locals.user.id) {
			return fail(400, {
				nombre,
				faltantesTexto,
				repetidasTexto,
				error: 'No podés emparejarte con vos mismo. Pedíle el link a otra persona.'
			});
		}

		// === MODO "actual": usar la colección que el visitor logueado YA tiene.
		// Bypaseamos el form y solo creamos el import del usuario actual hacia
		// el destinatario. Esto es lo que pasa cuando B (registrado, con su
		// álbum cargado) escanea el QR de A.
		if (modo === 'actual' && locals.user && porToken && porToken.id !== locals.user.id) {
			const [imp] = await db
				.insert(imports)
				.values({
					submitterId: locals.user.id,
					toUserId: destinatario.id,
					origen: 'publico'
				})
				.returning({ id: imports.id });
			throw redirect(303, `/compartir/exito/${imp.id}?token=${locals.user.token}`);
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

		// Anti-abuso: la creación de cuentas anónimas (+ ~990 filas c/u) es el
		// vector caro. Límite generoso por IP — 20 en 60s — para cazar bots sin
		// bloquear una multitud en una feria con WiFi compartido.
		const ip = getClientAddress();
		const rl = await chequearLimite(ip, 'compartir', 20, 60 * 1000);
		if (!rl.permitido) {
			return fail(429, {
				nombre,
				faltantesTexto,
				repetidasTexto,
				error: 'Demasiados envíos seguidos desde esta red. Esperá un momento y reintentá.'
			});
		}
		await registrarEvento(ip, 'compartir');

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
