import type { Sticker } from './db/schema';
import type { StickerConEstado } from './collection';

export type InventarioAjeno = {
	faltantes: string[];
	repetidas: { id: string; count: number }[];
};

/**
 * Alias de códigos: Figuritas / FIFA oficial → nuestros códigos internos.
 * Si seguimos descubriendo diferencias, agregalas acá.
 */
const ALIAS_CODIGO: Record<string, string> = {
	IRQ: 'IRK' // Irak — FIFA usa IRQ, nuestro seed quedó como IRK
};

function normCodigo(code: string): string {
	const c = code.toUpperCase();
	return ALIAS_CODIGO[c] ?? c;
}

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
 *
 * Formatos aceptados (se pueden mezclar):
 *   1. Una entrada por línea: "GER-01", "ger-01", "253" (número absoluto)
 *   2. Con cantidad: "GER-01 x2", "GER-01 *2", "GER-01 (2)"
 *   3. **Formato Figuritas** (líneas con prefijo de equipo y lista):
 *        "MEX 🇲🇽: 4, 5, 6"
 *        "FWC 🏆: 2, 3, 4"
 *        "GER: 1, 2, 3"
 *      Los números son relativos al equipo (1..20); se expanden a IDs.
 *   4. Líneas con viñetas (•, -, *, ·) y separadores por coma o salto de línea.
 *   5. Líneas que no calzan con ningún patrón se ignoran silenciosamente
 *      (ej: "Figuritas App - Lista", "Me faltan", URLs).
 */
export function parseInventario(
	texto: string,
	catalogo: Sticker[]
): { id: string; count: number }[] {
	if (!texto.trim()) return [];

	// Lookups del catálogo
	const porNumero = new Map<number, string>(); // numero absoluto -> id
	const idsValidos = new Set<string>();
	const porCodigoNum = new Map<string, string>(); // "MEX-4" canónico -> "MEX-04"
	for (const s of catalogo) {
		porNumero.set(s.numero, s.id);
		idsValidos.add(s.id);
		const guion = s.id.indexOf('-');
		if (guion > 0) {
			const code = s.id.slice(0, guion);
			const num = Number(s.id.slice(guion + 1));
			porCodigoNum.set(`${code}-${num}`, s.id);
		}
	}

	const items: { id: string; count: number }[] = [];

	for (const lineaRaw of texto.split('\n')) {
		const linea = lineaRaw.trim().replace(/^[•\-*·▪]+\s*/, '');
		if (!linea) continue;

		// (A) Formato Figuritas: "CODE [emoji/texto]: 1, 2, 3"
		const figu = linea.match(/^([A-Za-z]{2,4})\b[^:]*:\s*([\d,\s]+)$/);
		if (figu) {
			const code = normCodigo(figu[1]);
			const numeros = figu[2]
				.split(/[,\s]+/)
				.map((n) => Number(n))
				.filter((n) => Number.isFinite(n) && n >= 0);
			for (const num of numeros) {
				const id = porCodigoNum.get(`${code}-${num}`);
				if (id) items.push({ id, count: 1 });
			}
			continue;
		}

		// (B) Formato tradicional: una entrada por separador (también por coma)
		for (const tokenRaw of linea.split(/[,;]+/)) {
			const token = tokenRaw.trim();
			if (!token) continue;
			const m = token.match(/^([A-Za-z]{2,4}-?\d{1,3}|\d{1,4})\s*(?:[x*×]\s*(\d+)|\((\d+)\))?$/);
			if (!m) continue;

			let ref = m[1].toUpperCase().replace(/^([A-Z]+)(\d)/, '$1-$2');
			const count = Number(m[2] ?? m[3] ?? 1);

			// Aplicar alias y normalizar padding via porCodigoNum
			const guion = ref.indexOf('-');
			if (guion > 0) {
				const code = normCodigo(ref.slice(0, guion));
				const num = Number(ref.slice(guion + 1));
				const idCanonico = porCodigoNum.get(`${code}-${num}`);
				if (idCanonico) {
					items.push({ id: idCanonico, count });
					continue;
				}
			}

			let id: string | undefined;
			if (/^\d+$/.test(ref)) id = porNumero.get(Number(ref));
			else if (idsValidos.has(ref)) id = ref;
			if (id) items.push({ id, count });
		}
	}

	const dedup = new Map<string, number>();
	for (const it of items) dedup.set(it.id, (dedup.get(it.id) ?? 0) + it.count);
	return Array.from(dedup, ([id, count]) => ({ id, count }));
}

/**
 * Exporta una lista de stickers en formato Figuritas.
 * Agrupa por código de equipo y emite líneas como "MEX: 4, 5, 6".
 * Para exportar mis faltantes/repetidas para compartir con otros.
 *
 * `intro` (opcional, default 'Me faltan' o 'Repetidas') define el subtítulo.
 */
export function exportFiguritas(
	stickers: Sticker[],
	titulo: 'Me faltan' | 'Repetidas',
	subtitulo = 'Usa Méx Can 26'
): string {
	const grupos = new Map<string, number[]>();
	for (const s of stickers) {
		const guion = s.id.indexOf('-');
		if (guion <= 0) continue;
		const code = s.id.slice(0, guion);
		const num = Number(s.id.slice(guion + 1));
		// Revertir alias (IRK interno → IRQ exportado)
		const codeExport = Object.entries(ALIAS_CODIGO).find(([, v]) => v === code)?.[0] ?? code;
		if (!grupos.has(codeExport)) grupos.set(codeExport, []);
		grupos.get(codeExport)!.push(num);
	}

	const lineas: string[] = [];
	lineas.push('Figuritas App - Lista');
	lineas.push(subtitulo);
	lineas.push('');
	lineas.push(titulo);

	// Orden de los códigos según primer numero album (orden del Mundial)
	const minNumAlbum = new Map<string, number>();
	for (const s of stickers) {
		const guion = s.id.indexOf('-');
		if (guion <= 0) continue;
		const code = s.id.slice(0, guion);
		const codeExport = Object.entries(ALIAS_CODIGO).find(([, v]) => v === code)?.[0] ?? code;
		const prev = minNumAlbum.get(codeExport) ?? Infinity;
		if (s.numero < prev) minNumAlbum.set(codeExport, s.numero);
	}

	const ordenCodigos = [...grupos.keys()].sort((a, b) => {
		const na = minNumAlbum.get(a) ?? Infinity;
		const nb = minNumAlbum.get(b) ?? Infinity;
		return na - nb;
	});

	for (const code of ordenCodigos) {
		const nums = grupos.get(code)!.sort((a, b) => a - b);
		lineas.push(`${code}: ${nums.join(', ')}`);
	}

	return lineas.join('\n');
}

/**
 * Calcula el intercambio óptimo entre mi inventario y el inventario ajeno.
 *   - "doy": mis repetidas que él/ella no tiene (sus faltantes)
 *   - "recibo": sus repetidas de cosas que a mí me faltan
 *   - "balanceado": min(doy, recibo) — el número de stickers que se intercambian 1:1
 */
export function calcularMatch(
	misStickers: StickerConEstado[],
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
