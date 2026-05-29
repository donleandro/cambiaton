import { getColeccionCompleta } from '$lib/server/collection';
import { grupoDe, posicionAlbum, GRUPOS_MUNDIAL_2026 } from '$lib/server/groups';
import { exportFiguritas } from '$lib/server/matcher';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type Bucket = {
	total: number;
	tengo: number;
	faltan: number;
	repetidas: number;
};

function vacio(): Bucket {
	return { total: 0, tengo: 0, faltan: 0, repetidas: 0 };
}

function add(b: Bucket, s: { tengo: boolean; repetidas: number }) {
	b.total += 1;
	if (s.tengo) b.tengo += 1;
	else b.faltan += 1;
	b.repetidas += s.repetidas;
}

function pct(b: Bucket): number {
	return b.total === 0 ? 0 : (b.tengo / b.total) * 100;
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw error(401, 'No autenticado');
	const all = await getColeccionCompleta(locals.user.id);

	const general = vacio();
	for (const s of all) add(general, s);

	const confedMap = new Map<string, Bucket>();
	for (const s of all) {
		if (!confedMap.has(s.confederacion)) confedMap.set(s.confederacion, vacio());
		add(confedMap.get(s.confederacion)!, s);
	}

	const equipoMap = new Map<
		string,
		Bucket & {
			confederacion: string;
			grupo: string | null;
			numeroInicio: number;
			posicion: number;
		}
	>();
	for (const s of all) {
		let e = equipoMap.get(s.equipo);
		if (!e) {
			e = {
				...vacio(),
				confederacion: s.confederacion,
				grupo: grupoDe(s.equipo),
				numeroInicio: s.numero,
				posicion: posicionAlbum(s.equipo)
			};
			equipoMap.set(s.equipo, e);
		} else if (s.numero < e.numeroInicio) {
			e.numeroInicio = s.numero;
		}
		add(e, s);
	}

	const porConfederacion = Array.from(confedMap, ([nombre, b]) => ({
		nombre,
		...b,
		pct: pct(b)
	})).sort((a, b) => b.pct - a.pct);

	const porEquipo = Array.from(equipoMap, ([nombre, b]) => ({
		nombre,
		...b,
		pct: pct(b)
	})).sort((a, b) => a.numeroInicio - b.numeroInicio);

	const equiposCompletos = porEquipo.filter(
		(e) => e.confederacion !== 'Global' && e.tengo === e.total
	).length;
	const equiposReales = porEquipo.filter((e) => e.confederacion !== 'Global').length;

	const probNuevo = general.faltan / general.total;
	const sobresEstimados =
		probNuevo > 0 ? Math.ceil(general.faltan / (7 * probNuevo)) : 0;
	const sobresOptimistas =
		general.faltan > 0 ? Math.ceil(general.faltan / (7 * 0.6)) : 0;

	const misFaltantes = all.filter((s) => !s.tengo);
	const misRepetidas = all.filter((s) => s.repetidas > 0);
	const exportFaltantes = exportFiguritas(misFaltantes, 'Me faltan');
	const exportRepetidas = exportFiguritas(misRepetidas, 'Repetidas');

	// === ACCIONABLE: equipos a un paso de completar ===
	// Equipos con tengo > 0 y faltan ≤ 3 (excluye los ya completos y los no-tocados).
	const aUnPaso = porEquipo
		.filter((e) => e.confederacion !== 'Global' && e.faltan > 0 && e.faltan <= 3 && e.tengo > 0)
		.sort((a, b) => a.faltan - b.faltan || a.numeroInicio - b.numeroInicio)
		.slice(0, 8);
	// Para cada equipo "a un paso", listamos qué números puntuales faltan.
	const faltantesPorEquipo = new Map<string, { id: string; numero: number }[]>();
	for (const s of misFaltantes) {
		if (!faltantesPorEquipo.has(s.equipo)) faltantesPorEquipo.set(s.equipo, []);
		faltantesPorEquipo.get(s.equipo)!.push({ id: s.id, numero: s.numero });
	}
	const aUnPasoEnriquecido = aUnPaso.map((e) => ({
		...e,
		stickersFaltan: (faltantesPorEquipo.get(e.nombre) ?? []).sort((a, b) => a.numero - b.numero)
	}));

	// === POR GRUPO DEL MUNDIAL (A–L) ===
	const grupoMap = new Map<string, Bucket & { equipos: string[] }>();
	for (const e of porEquipo) {
		if (e.confederacion === 'Global') continue;
		const g = GRUPOS_MUNDIAL_2026[e.nombre];
		if (!g) continue;
		if (!grupoMap.has(g)) grupoMap.set(g, { ...vacio(), equipos: [] });
		const bucket = grupoMap.get(g)!;
		bucket.total += e.total;
		bucket.tengo += e.tengo;
		bucket.faltan += e.faltan;
		bucket.repetidas += e.repetidas;
		bucket.equipos.push(e.nombre);
	}
	const porGrupo = Array.from(grupoMap, ([letra, b]) => ({
		letra,
		...b,
		pct: pct(b)
	})).sort((a, b) => a.letra.localeCompare(b.letra));

	// === TOP REPETIDAS PARA CAMBIAR ===
	const topRepetidas = all
		.filter((s) => s.repetidas > 0)
		.sort((a, b) => b.repetidas - a.repetidas || a.numero - b.numero)
		.slice(0, 12);

	return {
		general: {
			...general,
			pct: pct(general),
			equiposCompletos,
			equiposReales,
			sobresEstimados,
			sobresOptimistas
		},
		aUnPaso: aUnPasoEnriquecido,
		porGrupo,
		topRepetidas,
		porConfederacion,
		porEquipo,
		exportFaltantes,
		exportRepetidas
	};
};
