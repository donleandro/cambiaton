/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

// Cache versionado: al cambiar `version` (cada build) se crea uno nuevo y se
// borran los viejos en `activate`, evitando servir contenido obsoleto.
const CACHE = `cambiaton-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (!url.protocol.startsWith('http')) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			// Assets hasheados del build → cache-first (son inmutables).
			if (ASSETS.includes(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}

			// Resto (navegaciones SSR) → network-first con fallback a lo cacheado.
			// Así la app abre aunque no haya señal en la feria, con la última
			// versión vista de la página.
			try {
				const response = await fetch(event.request);
				if (response.ok && url.origin === sw.location.origin && event.request.mode === 'navigate') {
					cache.put(event.request, response.clone());
				}
				return response;
			} catch {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				throw new Error(`Offline y sin cache para ${url.pathname}`);
			}
		})()
	);
});
