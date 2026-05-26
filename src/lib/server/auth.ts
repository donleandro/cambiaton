import { env } from '$env/dynamic/private';

const COOKIE_NAME = 'session';
const EXPIRY_DAYS = 30;

/**
 * Auth habilitada sólo si APP_PASSWORD_HASH está seteada.
 * Vacía → todas las rutas son públicas (cómodo para dev local).
 *
 * Generá el hash con:
 *   pnpm run hash-password "tu-password-aqui"
 */
export function authEnabled(): boolean {
	return !!env.APP_PASSWORD_HASH && env.APP_PASSWORD_HASH.length > 0;
}

async function sha256Hex(text: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', encoder.encode(text));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

const encoder = new TextEncoder();

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

function getSecret(): string {
	const s = env.SESSION_SECRET;
	if (!s || s.length < 16) {
		throw new Error(
			'SESSION_SECRET no está seteado o es muy corto (mínimo 16 chars). Generá uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
		);
	}
	return s;
}

export async function createSessionCookie(): Promise<string> {
	const expiry = Date.now() + EXPIRY_DAYS * 86400 * 1000;
	const sig = await hmacHex(String(expiry), getSecret());
	return `${expiry}.${sig}`;
}

export async function verifySessionCookie(value: string | undefined): Promise<boolean> {
	if (!value) return false;
	const dot = value.indexOf('.');
	if (dot < 0) return false;
	const expiryStr = value.slice(0, dot);
	const sig = value.slice(dot + 1);
	const expiry = Number(expiryStr);
	if (!Number.isFinite(expiry) || expiry < Date.now()) return false;
	const expected = await hmacHex(expiryStr, getSecret());
	return timingSafeEqual(sig, expected);
}

function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export async function verifyPassword(input: string): Promise<boolean> {
	const expected = env.APP_PASSWORD_HASH ?? '';
	if (!expected) return false;
	const inputHash = await sha256Hex(input);
	return timingSafeEqual(inputHash, expected.toLowerCase());
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_MAX_AGE = EXPIRY_DAYS * 86400;
