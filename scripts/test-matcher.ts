import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { stickers } from '../src/lib/server/db/schema.ts';
import { parseInventario, calcularMatch } from '../src/lib/server/matcher.ts';

const client = new Database('local.db');
const db = drizzle(client);
const all = db.select().from(stickers).all();
console.log(`Catálogo: ${all.length} stickers`);

const parserInput = `
GER-01
ger-05
253
BRA-07 x2
• ALG-10
- MEX-15 (3)
ESP-99 (no existe, debe ignorarse)
`;

const parsed = parseInventario(parserInput, all);
console.log('\nParseado:', parsed);

// Simular un inventario ajeno y calcular match
const ajeno = {
	faltantes: all.filter((s) => s.repetidas > 0).slice(0, 5).map((s) => s.id),
	repetidas: all.filter((s) => !s.tengo).slice(0, 5).map((s) => ({ id: s.id, count: 1 }))
};
console.log('\nAjeno simulado:');
console.log('  faltantes (que YO tengo repetidos):', ajeno.faltantes);
console.log('  repetidas (que A MÍ me faltan):', ajeno.repetidas.map((r) => r.id));

const match = calcularMatch(all, ajeno);
console.log('\nMatch:');
console.log('  doy:', match.doy.map((d) => `${d.id} (${d.equipo})`));
console.log('  recibo:', match.recibo.map((r) => `${r.id} (${r.equipo})`));
console.log('  balanceado:', match.balanceado);

client.close();
