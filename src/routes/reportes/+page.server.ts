import { db } from '$lib/server/db';
import { stickers } from '$lib/server/db/schema';
import { grupoDe, posicionAlbum } from '$lib/server/groups';
import { exportFiguritas } from '$lib/server/matcher';
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

export const load: PageServerLoad = async () => {
	const all = await db.select().from(stickers).orderBy(stickers.id);

	const general = vacio();
	for (const s of all) add(general, s);

	// Por confederación
	const confedMap = new Map<string, Bucket>();
	for (const s of all) {
		if (!confedMap.has(s.confederacion)) confedMap.set(s.confederacion, vacio());
		add(confedMap.get(s.confederacion)!, s);
	}

	// Por equipo
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

	// Estimación de sobres
	// Sobres en México: ~7 stickers/sobre. La probabilidad de que un sticker dado
	// sea "nuevo" cuando llevás N% completo es (1 - N%). Sobres esperados ≈
	// faltantes / (7 * (faltantes/total)).
	const probNuevo = general.faltan / general.total;
	const sobresEstimados =
		probNuevo > 0 ? Math.ceil(general.faltan / (7 * probNuevo)) : 0;
	// Para comparar contra el cálculo "60% nuevos" del Excel original:
	const sobresOptimistas =
		general.faltan > 0 ? Math.ceil(general.faltan / (7 * 0.6)) : 0;

	const misFaltantes = all.filter((s) => !s.tengo);
	const misRepetidas = all.filter((s) => s.repetidas > 0);
	const exportFaltantes = exportFiguritas(misFaltantes, 'Me faltan');
	const exportRepetidas = exportFiguritas(misRepetidas, 'Repetidas');

	return {
		general: {
			...general,
			pct: pct(general),
			equiposCompletos,
			equiposReales,
			sobresEstimados,
			sobresOptimistas
		},
		porConfederacion,
		porEquipo,
		exportFaltantes,
		exportRepetidas
	};
};
