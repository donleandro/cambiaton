import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { stickers } from '../src/lib/server/db/schema.ts';
import { parseInventario, exportFiguritas } from '../src/lib/server/matcher.ts';

const client = new Database('local.db');
const db = drizzle(client);
const all = db.select().from(stickers).all();

// Caso 1: formato Figuritas real (faltantes)
const figuritasInput = `Figuritas App - Lista
Usa Méx Can 26

Me faltan
FWC 🏆: 2, 3, 4
FWC 🌎: 5, 6, 7, 8
MEX 🇲🇽: 4, 5, 6, 7, 9, 10
RSA 🇿🇦: 1, 2, 5, 6, 7
IRQ 🇮🇶: 1, 2, 3

Descarga la app
https://www.figuritas.app/es/descargar`;

const parsed = parseInventario(figuritasInput, all);
console.log('=== Parseado del formato Figuritas ===');
console.log('Total IDs reconocidos:', parsed.length);
parsed.slice(0, 15).forEach((p) => console.log(' ', p.id));
if (parsed.length > 15) console.log('  ...');

// Verificar IRQ → IRK
const irq = parsed.filter((p) => p.id.startsWith('IRK'));
console.log('\nIRQ se mapeó a IRK:', irq.length, 'stickers');

// Caso 2: mezclar formato Figuritas + tradicional
const mixto = `MEX 🇲🇽: 1, 2, 3
GER-04
ARG-05 x2
253
- BRA: 1, 2`;
const parsedMixto = parseInventario(mixto, all);
console.log('\n=== Parseado mezcla ===');
parsedMixto.forEach((p) => console.log(' ', p.id, p.count > 1 ? `x${p.count}` : ''));

// Caso 3: export
const misRepetidas = all.filter((s) => s.repetidas > 0).slice(0, 30);
const exported = exportFiguritas(misRepetidas, 'Repetidas');
console.log('\n=== Export Figuritas (primeras 30 repetidas) ===');
console.log(exported);

client.close();
