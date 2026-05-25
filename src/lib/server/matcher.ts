import type { Sticker } from './db/schema';

export type InventarioAjeno = {
	faltantes: string[];
	repetidas: { id: string; count: number }[];
};

export type MatchItem = {
	id: string;
	equipo: string;
	numero: number;
	cantidad: number;
};

export type MatchResult = {
	doy: MatchItem[];
	recibo: MatchItem[];
	balanceado: number;
};

/**
 * Parsea texto pegado por el usuario en una lista de IDs.
 * Acepta:
 *   - "GER-01" o "ger-01" (case insensitive, normalizado a upper)
 *   - "253" (número del álbum, resuelto contra el catálogo)
 *   - "GER-01 x2" o "GER-01 *2" o "GER-01 (2)" para cantidades
 *   - Una entrada por línea, separadores tolerantes (coma, salto de línea)
 *   - Líneas vacías y prefijos comunes ("•", "-", "*") ignorados
 */
export function parseInventario(
	texto: string,
	catalogo: Sticker[]
): { id: string; count: number }[] {
	if (!texto.trim()) return [];

	const porNumero = new Map<number, string>();
	const idsValidos = new Set<string>();
	for (const s of catalogo) {
		porNumero.set(s.numero, s.id);
		idsValidos.add(s.id);
	}

	const items: { id: string; count: number }[] = [];

	const lineas = texto.split(/[\n,;]+/);
	for (const lineaRaw of lineas) {
		const linea = lineaRaw.trim().replace(/^[•\-*·]+\s*/, '');
		if (!linea) continue;

		const m = linea.match(/^([A-Za-z]{2,4}-?\d{1,3}|\d{1,4})\s*(?:[x*×]\s*(\d+)|\((\d+)\))?$/);
		if (!m) continue;

		const ref = m[1].toUpperCase().replace(/^([A-Z]+)(\d)/, '$1-$2');
		const count = Number(m[2] ?? m[3] ?? 1);

		let id: string | undefined;
		if (/^\d+$/.test(ref)) {
			id = porNumero.get(Number(ref));
		} else if (idsValidos.has(ref)) {
			id = ref;
		}

		if (id) items.push({ id, count });
	}

	const dedup = new Map<string, number>();
	for (const it of items) dedup.set(it.id, (dedup.get(it.id) ?? 0) + it.count);
	return Array.from(dedup, ([id, count]) => ({ id, count }));
}

/**
 * Calcula el intercambio óptimo entre mi inventario y el inventario ajeno.
 *   - "doy": mis repetidas que él/ella no tiene (sus faltantes)
 *   - "recibo": sus repetidas de cosas que a mí me faltan
 *   - "balanceado": min(doy, recibo) — el número de stickers que se intercambian 1:1
 */
export function calcularMatch(
	misStickers: Sticker[],
	ajeno: InventarioAjeno
): MatchResult {
	const misRepetidas = new Map<string, Sticker>();
	const misFaltantes = new Set<string>();
	for (const s of misStickers) {
		if (s.repetidas > 0) misRepetidas.set(s.id, s);
		if (!s.tengo) misFaltantes.add(s.id);
	}

	const susFaltantes = new Set(ajeno.faltantes);
	const susRepetidas = new Map(ajeno.repetidas.map((r) => [r.id, r.count]));

	const stickersById = new Map(misStickers.map((s) => [s.id, s]));

	const doy: MatchItem[] = [];
	for (const [id, sticker] of misRepetidas) {
		if (susFaltantes.has(id)) {
			doy.push({
				id,
				equipo: sticker.equipo,
				numero: sticker.numero,
				cantidad: sticker.repetidas
			});
		}
	}

	const recibo: MatchItem[] = [];
	for (const [id, count] of susRepetidas) {
		if (misFaltantes.has(id)) {
			const s = stickersById.get(id);
			if (!s) continue;
			recibo.push({ id, equipo: s.equipo, numero: s.numero, cantidad: count });
		}
	}

	doy.sort((a, b) => a.numero - b.numero);
	recibo.sort((a, b) => a.numero - b.numero);

	const totalDoy = doy.reduce((a, b) => a + b.cantidad, 0);
	const totalRecibo = recibo.reduce((a, b) => a + b.cantidad, 0);
	const balanceado = Math.min(totalDoy, totalRecibo);

	return { doy, recibo, balanceado };
}
