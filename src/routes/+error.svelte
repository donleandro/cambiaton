<script lang="ts">
	import { page } from '$app/state';

	const status = $derived(page.status);
	const message = $derived(page.error?.message ?? '');

	const titulo = $derived.by(() => {
		if (status === 404) return 'No encontramos esa página';
		if (status === 401) return 'Necesitás iniciar sesión';
		if (status === 403) return 'No tenés acceso a esto';
		if (status === 400) return 'Algo en la URL está mal';
		if (status === 500) return 'Algo se rompió de nuestro lado';
		return 'Algo no salió como esperaba';
	});

	const detalle = $derived.by(() => {
		if (status === 404) return 'El link que abriste no apunta a ninguna pantalla de la app. Quizá se rompió o cambió.';
		if (status === 401) return 'Esta pantalla requiere una sesión activa.';
		if (status === 403) return 'Esa página existe pero no es para vos. Si pensás que es un error, contame.';
		if (status === 500) return 'Tuvimos un problema procesando tu request. Ya quedó registrado de nuestro lado.';
		return message || 'No tenemos más detalle por ahora.';
	});

	const acciones = $derived.by<{ href: string; label: string; primary?: boolean }[]>(() => {
		if (status === 401) {
			const redirect = page.url.pathname + page.url.search;
			return [
				{ href: `/login?redirect=${encodeURIComponent(redirect)}`, label: 'Entrar', primary: true },
				{ href: '/registro', label: 'Crear cuenta' }
			];
		}
		return [
			{ href: '/', label: 'Volver al álbum', primary: true },
			{ href: '/mi-qr', label: 'Mi QR' }
		];
	});
</script>

<svelte:head><title>{status} · Cambiatón</title></svelte:head>

<div class="grid min-h-[70vh] place-items-center px-4 py-10">
	<div class="w-full max-w-md text-center">
		<!-- Mark -->
		<div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-stone-950">
			<svg
				viewBox="0 0 24 24"
				class="h-8 w-8 text-amber-400"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M6 8h12M15 5l3 3-3 3" />
				<path d="M18 16H6M9 13l-3 3 3 3" />
			</svg>
		</div>

		<div class="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
			Error {status}
		</div>
		<h1 class="mt-1 text-2xl font-black tracking-tight text-stone-900 sm:text-3xl">
			{titulo}
		</h1>
		<p class="mt-3 text-sm text-stone-600">{detalle}</p>

		{#if message && status !== 500 && message !== titulo}
			<pre
				class="mt-4 overflow-x-auto rounded-md border border-stone-200 bg-stone-50 p-3 text-left text-[11px] text-stone-600"
			>{message}</pre>
		{/if}

		<div class="mt-6 flex flex-wrap justify-center gap-2">
			{#each acciones as a (a.href)}
				<a
					href={a.href}
					class={a.primary
						? 'rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-stone-950 hover:bg-amber-300'
						: 'rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50'}
				>
					{a.label}
				</a>
			{/each}
		</div>

		<div class="mt-8 text-xs text-stone-400">
			Si esto te sigue apareciendo, contame y le pego una mirada. Ruta:
			<code class="rounded bg-stone-100 px-1 py-0.5 font-mono text-[10px] text-stone-600">
				{page.url.pathname}{page.url.search}
			</code>
		</div>
	</div>
</div>
