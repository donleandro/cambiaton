export type Grupo =
	| 'A'
	| 'B'
	| 'C'
	| 'D'
	| 'E'
	| 'F'
	| 'G'
	| 'H'
	| 'I'
	| 'J'
	| 'K'
	| 'L';

export const GRUPOS_MUNDIAL_2026: Record<string, Grupo> = {
	México: 'A',
	Sudáfrica: 'A',
	'Corea del Sur': 'A',
	'Rep Checa': 'A',
	Canadá: 'B',
	Boznia: 'B',
	Qatar: 'B',
	Suiza: 'B',
	Brasil: 'C',
	Marruecos: 'C',
	Haiti: 'C',
	Escocia: 'C',
	'Estados Unidos': 'D',
	Paraguay: 'D',
	Australia: 'D',
	Turquía: 'D',
	Alemania: 'E',
	Curazao: 'E',
	'Costa de Marfil': 'E',
	Ecuador: 'E',
	'Países Bajos': 'F',
	Japón: 'F',
	Suecia: 'F',
	Túnez: 'F',
	Bélgica: 'G',
	Egipto: 'G',
	Irán: 'G',
	'Nueva Zelanda': 'G',
	España: 'H',
	'Cabo Verde': 'H',
	'Arabia Saudita': 'H',
	Uruguay: 'H',
	Francia: 'I',
	Senegal: 'I',
	Iraq: 'I',
	Noruega: 'I',
	Argentina: 'J',
	Argelia: 'J',
	Austria: 'J',
	Jordania: 'J',
	Portugal: 'K',
	Congo: 'K',
	Uzbekistán: 'K',
	Colombia: 'K',
	Inglaterra: 'L',
	Croacia: 'L',
	Ghana: 'L',
	Panamá: 'L'
};

export const TODOS_GRUPOS: Grupo[] = [
	'A',
	'B',
	'C',
	'D',
	'E',
	'F',
	'G',
	'H',
	'I',
	'J',
	'K',
	'L'
];

export function grupoDe(equipo: string): Grupo | null {
	return GRUPOS_MUNDIAL_2026[equipo] ?? null;
}

/**
 * Orden EXACTO del sorteo oficial: dentro de cada grupo, los equipos aparecen
 * en orden de pot (1, 2, 3, 4) que es el que se imprime en el álbum.
 * Esto NO coincide con orden alfabético ni con orden de aparición de los
 * stickers en el catálogo seed; es lo que el usuario espera ver.
 */
export const ORDEN_ALBUM: string[] = [
	// Grupo A
	'México',
	'Sudáfrica',
	'Corea del Sur',
	'Rep Checa',
	// Grupo B
	'Canadá',
	'Boznia',
	'Qatar',
	'Suiza',
	// Grupo C
	'Brasil',
	'Marruecos',
	'Haiti',
	'Escocia',
	// Grupo D
	'Estados Unidos',
	'Paraguay',
	'Australia',
	'Turquía',
	// Grupo E
	'Alemania',
	'Curazao',
	'Costa de Marfil',
	'Ecuador',
	// Grupo F
	'Países Bajos',
	'Japón',
	'Suecia',
	'Túnez',
	// Grupo G
	'Bélgica',
	'Egipto',
	'Irán',
	'Nueva Zelanda',
	// Grupo H
	'España',
	'Cabo Verde',
	'Arabia Saudita',
	'Uruguay',
	// Grupo I
	'Francia',
	'Senegal',
	'Iraq',
	'Noruega',
	// Grupo J
	'Argentina',
	'Argelia',
	'Austria',
	'Jordania',
	// Grupo K
	'Portugal',
	'Congo',
	'Uzbekistán',
	'Colombia',
	// Grupo L
	'Inglaterra',
	'Croacia',
	'Ghana',
	'Panamá',
	// Patrocinadores (después de los grupos)
	'Coca-Cola'
];

const POSICION_ALBUM = new Map(ORDEN_ALBUM.map((e, i) => [e, i]));

/**
 * Devuelve la posición (0-based) del equipo en el orden del álbum.
 * Equipos no listados (ej: Introducción, Leyendas) devuelven Infinity
 * para quedar al final cuando se ordena ascendente.
 */
export function posicionAlbum(equipo: string): number {
	return POSICION_ALBUM.get(equipo) ?? Infinity;
}
