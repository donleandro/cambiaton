import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle as drizzleD1, type DrizzleD1Database } from 'drizzle-orm/d1';
import type { D1Database } from '@cloudflare/workers-types';
import * as schema from './schema';

type DB = DrizzleD1Database<typeof schema>;

const ctx = new AsyncLocalStorage<DB>();

export function runWithD1<T>(d1: D1Database, fn: () => T): T {
	const instance = drizzleD1(d1, { schema });
	return ctx.run(instance, fn);
}

function getActive(): DB {
	const active = ctx.getStore();
	if (!active) {
		throw new Error(
			'No D1 binding active. Asegurate de envolver el request en runWithD1(platform.env.DB, ...)'
		);
	}
	return active;
}

export const db = new Proxy({} as DB, {
	get(_target, prop, receiver) {
		const real = getActive() as unknown as Record<string | symbol, unknown>;
		const value = real[prop];
		return typeof value === 'function' ? (value as Function).bind(real) : value;
	}
}) as DB;
