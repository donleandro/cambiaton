import { browser } from '$app/environment';

/**
 * Cola de operaciones "aplicar cambiatón" para sobrevivir cortes de internet en
 * la feria. Cada op lleva un `opId` único; el servidor es idempotente sobre ese
 * id, así que reenviar la misma op (señal que parpadea) la aplica una sola vez.
 *
 * No depende de Service Worker / Background Sync (que iOS no soporta bien): se
 * sincroniza desde la página al recuperar conexión (`online` event / al abrir).
 */

const KEY = 'cambiaton-queue-v1';

export type QueuedOp = {
	opId: string;
	action: string; // ej: '/cambiaton?/confirmar'
	fields: Record<string, string>;
	ts: number;
	label?: string; // resumen para mostrar en UI (ej "5 ↔ 5 con Juan")
};

function read(): QueuedOp[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as QueuedOp[]) : [];
	} catch {
		return [];
	}
}

function write(ops: QueuedOp[]): void {
	if (!browser) return;
	try {
		localStorage.setItem(KEY, JSON.stringify(ops));
	} catch {
		/* storage lleno: nada que hacer */
	}
}

export function enqueue(op: QueuedOp): void {
	const q = read();
	if (q.some((o) => o.opId === op.opId)) return; // ya encolada
	q.push(op);
	write(q);
}

export function queued(): QueuedOp[] {
	return read();
}

export function count(): number {
	return read().length;
}

export function clear(): void {
	write([]);
}

/**
 * Reenvía las ops encoladas. Devuelve cuántas se aplicaron y cuántas quedan.
 *   - 2xx → aplicada (o duplicada, que el server resuelve idempotente) → sacar.
 *   - 4xx → error permanente (validación) → sacar para no reintentar infinito.
 *   - 5xx / red caída → dejar para el próximo intento.
 */
export async function flush(): Promise<{ done: number; left: number; failed: number }> {
	if (!browser || !navigator.onLine) return { done: 0, left: count(), failed: 0 };
	let q = read();
	let done = 0;
	let failed = 0;
	for (const op of [...q]) {
		try {
			const res = await fetch(op.action, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams(op.fields).toString()
			});
			if (res.ok) {
				q = q.filter((o) => o.opId !== op.opId);
				write(q);
				done++;
			} else if (res.status >= 400 && res.status < 500) {
				q = q.filter((o) => o.opId !== op.opId);
				write(q);
				failed++;
			}
			// 5xx → se deja en la cola
		} catch {
			// red caída a mitad de sync: cortar y reintentar después
			break;
		}
	}
	return { done, left: q.length, failed };
}
