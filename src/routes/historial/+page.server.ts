import { db } from '$lib/server/db';
import { imports, users } from '$lib/server/db/schema';
import { getIntercambios, getMovimientos } from '$lib/server/collection';
import { eq, desc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Una entrada de la línea de tiempo unificada. `forma` indica de dónde viene el
 * movimiento (cambiatón / lista / manual / ajuste). `link` es opcional: a dónde
 * lleva el botón "Ver →".
 */
type Evento = {
	ts: string;
	forma: 'cambiaton' | 'lista' | 'manual' | 'ajuste';
	titulo: string;
	detalle?: string;
	dispositivo?: string | null;
	link?: string;
	linkLabel?: string;
};

/** "iPhone; Safari" aproximado desde el user-agent, para mostrar lindo. */
function dispositivoDe(ua: string | null | undefined): string | null {
	if (!ua) return null;
	const so = /iphone|ipad|ipod/i.test(ua)
		? 'iPhone/iPad'
		: /android/i.test(ua)
			? 'Android'
			: /windows/i.test(ua)
				? 'Windows'
				: /mac os|macintosh/i.test(ua)
					? 'Mac'
					: /linux/i.test(ua)
						? 'Linux'
						: 'Otro';
	const nav = /edg/i.test(ua)
		? 'Edge'
		: /chrome|crios/i.test(ua)
			? 'Chrome'
			: /firefox|fxios/i.test(ua)
				? 'Firefox'
				: /safari/i.test(ua)
					? 'Safari'
					: '';
	return nav ? `${so} · ${nav}` : so;
}

function resumenIds(ids: string[], max = 4): string {
	if (ids.length === 0) return '—';
	const head = ids.slice(0, max).join(', ');
	return ids.length > max ? `${head} +${ids.length - max}` : head;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');
	const uid = locals.user.id;

	// 1) Trades aplicados (cambiatón + lista-compartida) — viven en `intercambios`.
	const trades = await getIntercambios(uid);
	// 2) Listas recibidas — viven en `imports` (con nombre del que la mandó).
	const recibidas = await db
		.select({
			id: imports.id,
			fecha: imports.fecha,
			status: imports.status,
			submitter: users.nombre
		})
		.from(imports)
		.leftJoin(users, eq(users.id, imports.submitterId))
		.where(eq(imports.toUserId, uid))
		.orderBy(desc(imports.id));
	// 3) Movimientos manuales / ajustes — viven en `op_log` (no en intercambios).
	const movimientos = await getMovimientos(uid, ['toggle', 'repetidas', 'ajuste']);

	const eventos: Evento[] = [];

	for (const t of trades) {
		const dados = (t.dados ?? []) as string[];
		const recibidos = (t.recibidos ?? []) as string[];
		const esLista = t.inicio === 'lista-compartida';
		eventos.push({
			ts: t.fecha,
			forma: esLista ? 'lista' : 'cambiaton',
			titulo: esLista
				? `Intercambio por lista${t.contraparte ? ` con ${t.contraparte}` : ''}`
				: `Cambiatón${t.contraparte ? ` con ${t.contraparte}` : ''}`,
			detalle: `Di ${dados.length} (${resumenIds(dados)}) ↔ Recibí ${recibidos.length} (${resumenIds(recibidos)})`,
			link: '/intercambios',
			linkLabel: 'Ver / ajustar'
		});
	}

	for (const r of recibidas) {
		const etiqueta =
			r.status === 'aplicado' ? 'aplicada' : r.status === 'archivado' ? 'archivada' : 'pendiente';
		eventos.push({
			ts: r.fecha,
			forma: 'lista',
			titulo: `Lista recibida de ${r.submitter ?? 'Anónimo'}`,
			detalle: `Estado: ${etiqueta}`,
			link: `/intercambio/${r.id}`,
			linkLabel: 'Abrir lista'
		});
	}

	for (const m of movimientos) {
		let payload: Record<string, unknown> = {};
		try {
			payload = m.payload ? JSON.parse(m.payload) : {};
		} catch {
			payload = {};
		}
		const id = String(payload.id ?? '');
		const disp = dispositivoDe(m.userAgent);
		if (m.kind === 'toggle') {
			eventos.push({
				ts: m.createdAt,
				forma: 'manual',
				titulo: payload.tengo ? `Marqué ${id} ✓` : `Quité ${id}`,
				dispositivo: disp,
				link: `/?q=${encodeURIComponent(id)}`,
				linkLabel: 'Ver en álbum'
			});
		} else if (m.kind === 'repetidas') {
			const d = Number(payload.delta ?? 0);
			eventos.push({
				ts: m.createdAt,
				forma: 'manual',
				titulo: `${d > 0 ? '+' : ''}${d} repetida en ${id}`,
				dispositivo: disp,
				link: `/?q=${encodeURIComponent(id)}`,
				linkLabel: 'Ver en álbum'
			});
		} else {
			eventos.push({
				ts: m.createdAt,
				forma: 'ajuste',
				titulo: 'Ajuste de intercambio',
				dispositivo: disp,
				link: '/intercambios',
				linkLabel: 'Ver'
			});
		}
	}

	// Orden global por fecha desc.
	eventos.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));

	// Agrupar por día (YYYY-MM-DD) para los encabezados de la timeline.
	const dias: { dia: string; eventos: Evento[] }[] = [];
	for (const ev of eventos) {
		const dia = ev.ts.slice(0, 10);
		let grupo = dias.find((g) => g.dia === dia);
		if (!grupo) {
			grupo = { dia, eventos: [] };
			dias.push(grupo);
		}
		grupo.eventos.push(ev);
	}

	return { dias, total: eventos.length };
};
