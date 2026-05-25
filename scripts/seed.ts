import * as XLSX from 'xlsx';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { stickers, extras } from '../src/lib/server/db/schema.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = resolve(__dirname, '..', '..', 'Album_Panini_Mundial_2026.xlsx');
const DB_URL = process.env.DATABASE_URL ?? 'local.db';

type StickerRow = {
	ID: string;
	Tengo: boolean;
	'Sección/Equipo': string;
	Confederación: string;
	Número: number;
	Tipo: string;
	Repetidas: number;
	Descripción: string;
};

type ExtraRow = {
	ID: string;
	Jugador: string;
	Variante: string;
	Tengo: boolean;
	Repetidas: number;
};

const wb = XLSX.read(readFileSync(EXCEL_PATH), { type: 'buffer' });

const stickersSheet = wb.Sheets['Stickers'];
const extrasSheet = wb.Sheets['Extras'];
if (!stickersSheet || !extrasSheet) {
	throw new Error('Hojas Stickers o Extras no encontradas');
}

const stickersRows = XLSX.utils.sheet_to_json<StickerRow>(stickersSheet);
const extrasRows = XLSX.utils.sheet_to_json<ExtraRow>(extrasSheet);

console.log(`Leídos: ${stickersRows.length} stickers, ${extrasRows.length} extras`);

const client = new Database(DB_URL);
const db = drizzle(client);

db.delete(stickers).run();
db.delete(extras).run();

const stickersData = stickersRows.map((r) => ({
	id: String(r.ID),
	equipo: String(r['Sección/Equipo']),
	confederacion: String(r['Confederación']),
	numero: Number(r['Número']),
	tipo: String(r.Tipo),
	descripcion: r['Descripción'] ? String(r['Descripción']) : '',
	tengo: r.Tengo === true,
	repetidas: Number(r.Repetidas) || 0
}));

const extrasData = extrasRows.map((r) => ({
	id: String(r.ID),
	jugador: String(r.Jugador),
	variante: String(r.Variante),
	tengo: r.Tengo === true,
	repetidas: Number(r.Repetidas) || 0
}));

const insertStickers = db.insert(stickers).values(stickersData);
insertStickers.run();
const insertExtras = db.insert(extras).values(extrasData);
insertExtras.run();

const tengo = stickersData.filter((s) => s.tengo).length;
const repetidasTotal = stickersData.reduce((acc, s) => acc + s.repetidas, 0);

console.log(`✓ Insertados ${stickersData.length} stickers (tengo: ${tengo}, repetidas: ${repetidasTotal})`);
console.log(`✓ Insertados ${extrasData.length} extras`);

client.close();
