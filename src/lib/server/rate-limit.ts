import { db } from './db';
import { loginAttempts } from './db/schema';
import { and, eq, gte, sql } from 'drizzle-orm';

/**
 * Rate limit de login por IP.
 *
 * Reglas:
 *   - Si tenés ≥ MAX_FAILS fallos en los últimos VENTANA_MS ms → bloqueo
 *   - El bloqueo dura hasta que VENTANA_MS haya pasado desde tu último fallo
 *   - Un éxito limpia tus fallos (deja sólo el éxito en la tabla)
 *
 * Es deliberadamente simple: una tabla, dos queries, sirve igual en SQLite
 * local y en Cloudflare D1.
 */

const MAX_FAILS = 5;
const VENTANA_MS = 15 * 60 * 1000; // 15 minutos

export type RateLimitCheck =
	| { permitido: true }
	| { permitido: false; bloqueadoPorMs: number };

export async function chequearRateLimit(ip: string): Promise<RateLimitCheck> {
	const desde = Date.now() - VENTANA_MS;

	const filas = await db
		.select()
		.from(loginAttempts)
		.where(
			and(
				eq(loginAttempts.ip, ip),
				eq(loginAttempts.success, false),
				gte(loginAttempts.fecha, desde)
			)
		)
		.orderBy(loginAttempts.fecha);

	if (filas.length < MAX_FAILS) return { permitido: true };

	// El bloqueo dura hasta que el fallo más viejo de los últimos MAX_FAILS
	// quede fuera de la ventana — momento en el que ya no quedarán MAX_FAILS
	// fallos dentro de la ventana.
	const masViejo = filas[filas.length - MAX_FAILS].fecha;
	const liberacion = masViejo + VENTANA_MS;
	const bloqueadoPorMs = Math.max(0, liberacion - Date.now());

	if (bloqueadoPorMs === 0) return { permitido: true };
	return { permitido: false, bloqueadoPorMs };
}

export async function registrarIntento(ip: string, success: boolean): Promise<void> {
	await db.insert(loginAttempts).values({ ip, fecha: Date.now(), success });

	// Si fue éxito, limpiá fallos viejos de esa IP (la tabla no crece sin freno)
	if (success) {
		await db
			.delete(loginAttempts)
			.where(and(eq(loginAttempts.ip, ip), eq(loginAttempts.success, false)));
	}

	// Limpieza oportunista: borrar registros > 24h para que la tabla no crezca
	const limite = Date.now() - 24 * 60 * 60 * 1000;
	await db.delete(loginAttempts).where(sql`${loginAttempts.fecha} < ${limite}`);
}

export function formateaEspera(ms: number): string {
	const totalSeg = Math.ceil(ms / 1000);
	if (totalSeg < 60) return `${totalSeg} segundos`;
	const min = Math.ceil(totalSeg / 60);
	return `${min} ${min === 1 ? 'minuto' : 'minutos'}`;
}
