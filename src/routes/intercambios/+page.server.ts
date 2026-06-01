import { db } from '$lib/server/db';
import { imports, users } from '$lib/server/db/schema';
import { calcularMatch, type InventarioAjeno } from '$lib/server/matcher';
import {
	getColeccionCompleta,
	getIntercambios,
	getIntercambio,
	actualizarIntercambio,
	eliminarIntercambio,
	setTengo,
	deltaRepetidas,
	tradesPosteriores,
	logOp
} from '$lib/server/collection';
import { grupoDe } from '$lib/server/groups';
import { desc, eq } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');

	const lista = await db
		.select({
			id: imports.id,
			fecha: imports.fecha,
			status: imports.status,
			origen: imports.origen,
			submitterId: imports.submitterId,
			submitterNombre: users.nombre
		})
		.from(imports)
		.leftJoin(users, eq(users.id, imports.submitterId))
		.where(eq(imports.toUserId, locals.user.id))
		.orderBy(desc(imports.id));

	const miColeccion = await getColeccionCompleta(locals.user.id);

	const enriquecidos = await Promise.all(
		lista.map(async (imp) => {
			const suColeccion = await getColeccionCompleta(imp.submitterId);
			const inventarioAjeno: InventarioAjeno = {
				faltantes: suColeccion.filter((s) => !s.tengo).map((s) => s.id),
				repetidas: suColeccion
					.filter((s) => s.repetidas > 0)
					.map((s) => ({ id: s.id, count: s.repetidas }))
			};
			const match = calcularMatch(miColeccion, inventarioAjeno);
			return {
				id: imp.id,
				nombre: imp.submitterNombre ?? 'Anónimo',
				fecha: imp.fecha,
				status: imp.status,
				origen: imp.origen,
				doy: match.doy.length,
				recibo: match.recibo.length,
				balanceado: match.balanceado
			};
		})
	);

	const pendientes = enriquecidos.filter((e) => e.status === 'pendiente').length;
	const aplicados = enriquecidos.filter((e) => e.status === 'aplicado').length;
	const archivados = enriquecidos.filter((e) => e.status === 'archivado').length;

	// --- Log del Cambiatón (trades aplicados) + datos para ajustar -------------
	const catalogo: Record<
		string,
		{ id: string; equipo: string; numero: number; grupo: string | null }
	> = Object.fromEntries(
		miColeccion.map((s) => [
			s.id,
			{ id: s.id, equipo: s.equipo, numero: s.numero, grupo: grupoDe(s.equipo) }
		])
	);
	const misFaltantes = miColeccion
		.filter((s) => !s.tengo)
		.map((s) => ({ id: s.id, equipo: s.equipo, numero: s.numero, grupo: grupoDe(s.equipo) }));
	const misRepetidas = miColeccion
		.filter((s) => s.repetidas > 0)
		.map((s) => ({
			id: s.id,
			equipo: s.equipo,
			numero: s.numero,
			grupo: grupoDe(s.equipo),
			repetidas: s.repetidas
		}));

	const cambiatones = (await getIntercambios(locals.user.id)).map((i) => ({
		id: i.id,
		fecha: i.fecha,
		contraparte: i.contraparte,
		contraparteUserId: i.contraparteUserId,
		inicio: i.inicio,
		dados: (i.dados ?? []) as string[],
		recibidos: (i.recibidos ?? []) as string[]
	}));

	return {
		intercambios: enriquecidos,
		stats: { pendientes, aplicados, archivados, total: enriquecidos.length },
		cambiatones,
		catalogo,
		misFaltantes,
		misRepetidas
	};
};

export const actions: Actions = {
	/**
	 * Ajusta un cambiatón ya aplicado: recibe el snapshot nuevo (dados/recibidos),
	 * calcula el diff contra el guardado y revierte/aplica en la colección.
	 *   - quitar de "doy"      -> no lo di despues de todo -> +1 repetida
	 *   - agregar a "doy"      -> lo doy ahora             -> -1 repetida
	 *   - quitar de "recibo"   -> no la recibi             -> tengo=false
	 *   - agregar a "recibo"   -> la recibi                -> tengo=true
	 * Si el intercambio tiene contraparteUserId (ej: aplicar lista compartida), se
	 * aplica el efecto espejo en la coleccion de la contraparte (cambio bilateral).
	 * Si queda 0 a 0, se interpreta como anular: revierte todo y borra el registro.
	 */
	ajustar: async ({ request, locals, getClientAddress }) => {
		if (!locals.user) return fail(401, { error: 'No autenticado' });
		const fd = await request.formData();
		const id = Number(fd.get('id'));
		if (!Number.isFinite(id)) return fail(400, { error: 'ID inválido.' });
		const confirmado = fd.get('confirmado') === '1';

		const nuevoDados = String(fd.get('dados') ?? '')
			.split(',')
			.filter(Boolean);
		const nuevoRecibidos = String(fd.get('recibidos') ?? '')
			.split(',')
			.filter(Boolean);

		if (nuevoDados.length !== nuevoRecibidos.length) {
			return fail(400, {
				error: `El cambio sigue siendo 1 a 1: ${nuevoDados.length} doy vs ${nuevoRecibidos.length} recibo.`
			});
		}

		const old = await getIntercambio(locals.user.id, id);
		if (!old) return fail(404, { error: 'Intercambio no encontrado.' });

		const me = locals.user.id;
		const oldDados = (old.dados ?? []) as string[];
		const oldRecibidos = (old.recibidos ?? []) as string[];
		const setNuevoDados = new Set(nuevoDados);
		const setOldDados = new Set(oldDados);
		const setNuevoRec = new Set(nuevoRecibidos);
		const setOldRec = new Set(oldRecibidos);

		const doyQuitados = oldDados.filter((s) => !setNuevoDados.has(s));
		const doyAgregados = nuevoDados.filter((s) => !setOldDados.has(s));
		const recQuitados = oldRecibidos.filter((s) => !setNuevoRec.has(s));
		const recAgregados = nuevoRecibidos.filter((s) => !setOldRec.has(s));

		// === Escalera al deshacer un "lo tengo" =================================
		// Solo si el ajuste QUITA algún "recibí" (eso volvería un sticker a faltante).
		// Mover repetidas (doy +/-) o AGREGAR recibidos no se frena nunca.
		const quitaTengo = recQuitados.length > 0;
		if (quitaTengo) {
			const edadMin = (Date.now() - new Date(old.fecha).getTime()) / 60000;
			const tradesDespues = await tradesPosteriores(me, old.fecha);
			const VEINTICUATRO_H = 24 * 60;

			// Bloqueo duro: muy viejo, o ya hubo 2+ trades reales después.
			if (edadMin > VEINTICUATRO_H || tradesDespues >= 2) {
				const motivo =
					edadMin > VEINTICUATRO_H
						? 'pasaron más de 24 h desde ese cambio'
						: `hiciste ${tradesDespues} intercambios después de este`;
				return fail(423, {
					id,
					bloqueado: true,
					error: `No se puede deshacer desde la app: ${motivo}. Para no romper la integridad, ajustalo manualmente con la persona.`
				});
			}

			// Aviso confirmable: pasó más de 15 min (pero todavía dentro de las reglas).
			if (edadMin > 15 && !confirmado) {
				return fail(409, {
					id,
					necesitaConfirmar: true,
					mensaje: `Este cambio es de hace ${formatoEdad(edadMin)}. Te recomendamos no deshacerlo desde la app — mejor ajustalo físicamente con la persona. ¿Continuar igual?`
				});
			}
		}
		// =======================================================================

		const ctx = {
			ip: getClientAddress?.() ?? null,
			userAgent: request.headers.get('user-agent')
		};

		// --- Sólo MI lado ---
		// (Antes esto también mutaba la colección de la contraparte "en espejo". Se
		// quitó: cada quien controla su propia colección; un ajuste mío no debe
		// tocar la de otro sin su consentimiento.)
		for (const sid of doyQuitados) await deltaRepetidas(me, sid, 1); // no lo di -> recupero repetida
		for (const sid of doyAgregados) await deltaRepetidas(me, sid, -1); // lo doy -> descuento
		for (const sid of recQuitados) await setTengo(me, sid, false); // no la recibi -> faltante
		for (const sid of recAgregados) await setTengo(me, sid, true); // la recibi -> tengo

		if (nuevoDados.length === 0 && nuevoRecibidos.length === 0) {
			await eliminarIntercambio(locals.user.id, id);
			await logOp(me, 'ajuste', { id, accion: 'anular', recQuitados, confirmado }, ctx);
			return { ajustado: true, anulado: true, id };
		}

		await actualizarIntercambio(locals.user.id, id, {
			dados: nuevoDados,
			recibidos: nuevoRecibidos
		});
		await logOp(
			me,
			'ajuste',
			{ id, accion: 'ajustar', recQuitados, recAgregados, confirmado },
			ctx
		);
		return { ajustado: true, anulado: false, id };
	}
};

/** Edad legible para el aviso: "23 min", "3 h", "1 día". */
function formatoEdad(minutos: number): string {
	if (minutos < 60) return `${Math.round(minutos)} min`;
	const horas = minutos / 60;
	if (horas < 24) return `${Math.round(horas)} h`;
	const dias = Math.round(horas / 24);
	return `${dias} ${dias === 1 ? 'día' : 'días'}`;
}
