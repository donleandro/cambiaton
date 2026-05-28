<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copiado = $state(false);

	async function copiar() {
		try {
			await navigator.clipboard.writeText(data.compartirUrl);
			copiado = true;
			setTimeout(() => (copiado = false), 2000);
		} catch {
			alert('No se pudo copiar. Seleccioná manualmente.');
		}
	}

	const waText = encodeURIComponent(
		`Hola, te paso mi link para que me compartas tu lista del álbum Mundial 2026: ${data.compartirUrl}`
	);
</script>

<svelte:head><title>Mi QR · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
		<div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
			<h1 class="text-lg font-bold tracking-tight">Mi QR para compartir</h1>
			<a href="/" class="text-sm text-stone-600 hover:text-stone-900">← Catálogo</a>
		</div>
	</header>

	<div class="mx-auto max-w-2xl px-4 py-6">
		<p class="mb-4 text-sm text-stone-600">
			Tu link personal. Quien lo escanee y pegue su lista te llega como propuesta de intercambio en
			<a href="/intercambios" class="font-semibold text-stone-900 underline">Intercambios</a>.
		</p>

		{#if data.esLocalhost}
			<div class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
				<strong>Heads-up:</strong> estás en <code>localhost</code>. El QR apunta a una URL que solo
				funciona en tu propia compu. Para que ande en un celular ajeno necesitás reiniciar el dev
				server con <code class="font-mono">pnpm run dev -- --host</code> y entrar desde la IP local
				que muestre (ej. <code>192.168.x.y:5173</code>). Cuando despleguemos a Cloudflare esto va a
				usar el dominio público y funciona sin más.
			</div>
		{/if}

		<div class="mx-auto mb-4 max-w-md rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
			<div class="aspect-square">{@html data.qrSvg}</div>
		</div>

		<div class="mb-3 flex flex-wrap items-center gap-2">
			<input
				readonly
				value={data.compartirUrl}
				class="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs"
			/>
			<button
				type="button"
				onclick={copiar}
				class="rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white hover:bg-stone-800"
			>
				{copiado ? '✓ Copiado' : 'Copiar URL'}
			</button>
		</div>

		<a
			href="https://wa.me/?text={waText}"
			target="_blank"
			rel="noopener"
			class="block w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
		>
			Compartir link por WhatsApp
		</a>
	</div>
</div>
