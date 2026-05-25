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
	Irak: 'I',
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
