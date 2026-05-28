/**
 * Migración a multi-usuario.
 *
 * - Lee stickers.tengo y stickers.repetidas
 * - Crea tabla users con vos como user #1 (admin)
 * - Crea tabla colecciones con todos esos estados copiados para user 1
 * - Recrea stickers sin tengo/repetidas (vuelven a ser catálogo puro)
 * - Recrea imports con submitter_id/to_user_id (descarta los anteriores que eran de prueba)
 *
 * Idempotente: si user 1 ya existe, no hace nada. Si las columnas viejas ya
 * no existen, también es no-op.
 */
import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';

const DB_URL = process.env.DATABASE_URL ?? 'local.db';
const ADMIN_HASH = process.env.APP_PASSWORD_HASH;
if (!ADMIN_HASH) {
	console.error('Falta APP_PASSWORD_HASH en .env');
	process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'owner@album.local';
const ADMIN_NOMBRE = process.env.ADMIN_NOMBRE ?? 'Leandro';

const db = new Database(DB_URL, { timeout: 5000 });
db.pragma('foreign_keys = OFF');

function tableHasColumn(table: string, col: string): boolean {
	const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
	return rows.some((r) => r.name === col);
}

function tableExists(name: string): boolean {
	const r = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
		.get(name);
	return !!r;
}

const stickersHasTengo = tableHasColumn('stickers', 'tengo');
const usersExists = tableExists('users');
const coleccionesExists = tableExists('colecciones');

console.log('Estado actual:');
console.log('  stickers.tengo existe:', stickersHasTengo);
console.log('  users existe:', usersExists);
console.log('  colecciones existe:', coleccionesExists);

if (usersExists) {
	const user = db.prepare('SELECT id FROM users WHERE id = 1').get();
	if (user) {
		console.log('\nMigración ya aplicada (user 1 existe). Salgo sin tocar nada.');
		process.exit(0);
	}
}

// Snapshot del estado antes de tocar nada
type SnapshotRow = { id: string; tengo: number; repetidas: number };
let snapshot: SnapshotRow[] = [];
if (stickersHasTengo) {
	snapshot = db
		.prepare('SELECT id, tengo, repetidas FROM stickers')
		.all() as SnapshotRow[];
	console.log(`\nSnapshot: ${snapshot.length} stickers, ` +
		`${snapshot.filter((s) => s.tengo).length} tengo, ` +
		`${snapshot.reduce((a, b) => a + b.repetidas, 0)} repetidas totales`);
}

const migrate = db.transaction(() => {
	// 1. users
	if (!usersExists) {
		db.exec(`
			CREATE TABLE users (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				token TEXT NOT NULL UNIQUE,
				nombre TEXT NOT NULL,
				email TEXT UNIQUE,
				password_hash TEXT,
				is_admin INTEGER NOT NULL DEFAULT 0,
				created_at TEXT NOT NULL,
				claimed_at TEXT
			)
		`);
		console.log('✓ Tabla users creada');
	}

	// 2. colecciones
	if (!coleccionesExists) {
		db.exec(`
			CREATE TABLE colecciones (
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				sticker_id TEXT NOT NULL REFERENCES stickers(id) ON DELETE CASCADE,
				tengo INTEGER NOT NULL DEFAULT 0,
				repetidas INTEGER NOT NULL DEFAULT 0,
				PRIMARY KEY (user_id, sticker_id)
			)
		`);
		console.log('✓ Tabla colecciones creada');
	}

	// 3. User #1 (admin = vos)
	const token = randomBytes(16).toString('hex');
	const ahora = new Date().toISOString();
	db.prepare(
		`INSERT INTO users (id, token, nombre, email, password_hash, is_admin, created_at, claimed_at)
		 VALUES (1, ?, ?, ?, ?, 1, ?, ?)`
	).run(token, ADMIN_NOMBRE, ADMIN_EMAIL, ADMIN_HASH, ahora, ahora);
	console.log(`✓ User #1 creado: ${ADMIN_NOMBRE} <${ADMIN_EMAIL}>`);

	// 4. Poblar colecciones desde el snapshot
	if (snapshot.length > 0) {
		const insert = db.prepare(
			'INSERT INTO colecciones (user_id, sticker_id, tengo, repetidas) VALUES (1, ?, ?, ?)'
		);
		for (const s of snapshot) {
			if (s.tengo || s.repetidas > 0) {
				insert.run(s.id, s.tengo, s.repetidas);
			}
		}
		const count = db
			.prepare('SELECT COUNT(*) as n FROM colecciones WHERE user_id = 1')
			.get() as { n: number };
		console.log(`✓ ${count.n} filas en colecciones para user 1`);
	}

	// 5. Recrear stickers sin tengo/repetidas
	if (stickersHasTengo) {
		db.exec(`
			CREATE TABLE stickers_new (
				id TEXT PRIMARY KEY,
				equipo TEXT NOT NULL,
				confederacion TEXT NOT NULL,
				numero INTEGER NOT NULL,
				tipo TEXT NOT NULL,
				descripcion TEXT NOT NULL DEFAULT ''
			);
			INSERT INTO stickers_new (id, equipo, confederacion, numero, tipo, descripcion)
				SELECT id, equipo, confederacion, numero, tipo, descripcion FROM stickers;
			DROP TABLE stickers;
			ALTER TABLE stickers_new RENAME TO stickers;
		`);
		console.log('✓ stickers recreada sin tengo/repetidas');
	}

	// 6. Recrear imports con submitter_id / to_user_id (descarta los anteriores)
	if (tableExists('imports')) {
		const oldCount = db.prepare('SELECT COUNT(*) as n FROM imports').get() as { n: number };
		db.exec('DROP TABLE imports');
		console.log(`✓ Tabla imports vieja descartada (${oldCount.n} filas de prueba)`);
	}
	db.exec(`
		CREATE TABLE imports (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			fecha TEXT NOT NULL,
			submitter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			status TEXT NOT NULL DEFAULT 'pendiente',
			origen TEXT NOT NULL DEFAULT 'manual'
		)
	`);
	console.log('✓ Tabla imports nueva creada');
});

migrate();
db.pragma('foreign_keys = ON');
db.close();

console.log('\n✓ Migración completada.');
console.log(`Tu cuenta admin: ${ADMIN_EMAIL} (password sin cambios)`);
console.log('Para cambiar email/nombre después: actualizá en la BD o agregamos una pantalla de perfil.');
