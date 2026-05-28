import { env } from '$env/dynamic/private';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';

const COOKIE_NAME = 'session';
const EXPIRY_DAYS = 30;

const encoder = new TextEncoder();

function getSecret(): string {
	const s = env.SESSION_SECRET;
	if (!s || s.length < 16) {
		throw new Error(
			'SESSION_SECRET no está seteado o es muy corto (mínimo 16 chars). Generá con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
		);
	}
	return s;
}

async function hmacHex(message: string, secret: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function sha256Hex(text: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', encoder.encode(text));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Sessión es: "<userId>.<expiry>.<hmac(userId|expiry, secret)>"
 * Permite saber qué usuario es sin pegarle a la BD, con integridad firmada.
 */
export async function createSessionCookie(userId: number): Promise<string> {
	const expiry = Date.now() + EXPIRY_DAYS * 86400 * 1000;
	const payload = `${userId}.${expiry}`;
	const sig = await hmacHex(payload, getSecret());
	return `${payload}.${sig}`;
}

export type Session = { userId: number } | null;

export async function verifySessionCookie(value: string | undefined): Promise<Session> {
	if (!value) return null;
	const parts = value.split('.');
	if (parts.length !== 3) return null;
	const [userIdStr, expiryStr, sig] = parts;
	const userId = Number(userIdStr);
	const expiry = Number(expiryStr);
	if (!Number.isFinite(userId) || !Number.isFinite(expiry)) return null;
	if (expiry < Date.now()) return null;
	const expected = await hmacHex(`${userIdStr}.${expiryStr}`, getSecret());
	if (!timingSafeEqual(sig, expected)) return null;
	return { userId };
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/**
 * Verifica email + password contra la BD. Devuelve el userId si coincide.
 */
export async function verifyPasswordLogin(
	email: string,
	password: string
): Promise<number | null> {
	const [user] = await db
		.select({ id: users.id, hash: users.passwordHash })
		.from(users)
		.where(eq(users.email, email.toLowerCase().trim()))
		.limit(1);
	if (!user || !user.hash) return null;
	const inputHash = await sha256Hex(password);
	if (!timingSafeEqual(inputHash, user.hash)) return null;
	return user.id;
}

/**
 * Crea un usuario anonymous (sin email/password todavía). Devuelve el user creado.
 */
export async function createAnonymousUser(nombre: string): Promise<{ id: number; token: string }> {
	const token = randomBytes(16).toString('hex');
	const [user] = await db
		.insert(users)
		.values({ token, nombre })
		.returning({ id: users.id, token: users.token });
	return user;
}

/**
 * "Reclama" un usuario anonymous agregándole email + password.
 * Falla si el email ya está tomado por otro usuario.
 */
export async function claimUser(
	userId: number,
	email: string,
	password: string,
	nombre?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
	const emailNorm = email.toLowerCase().trim();
	if (!emailNorm.includes('@')) {
		return { ok: false, error: 'Email inválido' };
	}
	if (password.length < 6) {
		return { ok: false, error: 'Password debe tener al menos 6 caracteres' };
	}

	// Email ya tomado por otra cuenta?
	const [conflict] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, emailNorm))
		.limit(1);
	if (conflict && conflict.id !== userId) {
		return { ok: false, error: 'Ese email ya tiene una cuenta' };
	}

	const passwordHash = await sha256Hex(password);
	await db
		.update(users)
		.set({
			email: emailNorm,
			passwordHash,
			claimedAt: new Date().toISOString(),
			...(nombre ? { nombre } : {})
		})
		.where(eq(users.id, userId));

	return { ok: true };
}

export async function getUserById(userId: number) {
	const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	return u ?? null;
}

export async function getUserByToken(token: string) {
	const [u] = await db.select().from(users).where(eq(users.token, token)).limit(1);
	return u ?? null;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE = EXPIRY_DAYS * 86400;
