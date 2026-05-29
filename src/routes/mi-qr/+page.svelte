<script lang="ts">
	import { track } from '$lib/client/track';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let copiado = $state(false);
	let fullscreen = $state(false);

	async function copiar() {
		try {
			await navigator.clipboard.writeText(data.compartirUrl);
			copiado = true;
			track('share_mi_qr', { method: 'copy' });
			setTimeout(() => (copiado = false), 2000);
		} catch {
			alert('No se pudo copiar. Seleccioná manualmente.');
		}
	}

	const waText = $derived(
		encodeURIComponent(
			`Hola, te paso mi link para que me compartas tu lista del álbum Mundial 2026: ${data.compartirUrl}`
		)
	);

	// Permitir cerrar el fullscreen con Escape.
	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') fullscreen = false;
	}
</script>

<svelte:head><title>Mi QR · Cambiatón</title></svelte:head>
<svelte:window onkeydown={onKey} />

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
			<a href="/" class="text-sm text-stone-600 hover:text-stone-900">← Catálogo</a>
			<h1 class="text-sm font-semibold text-stone-500">Tu QR personal</h1>
			<div class="w-16"></div>
		</div>
	</header>

	<div class="mx-auto max-w-md px-4 py-6">
		<!-- Tarjeta principal -->
		<div class="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
			<!-- Banner top con el nombre -->
			<div class="bg-stone-950 px-5 pt-5 pb-3 text-center">
				<div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">
					Compartir mi álbum
				</div>
				<div class="mt-1 text-2xl font-black text-stone-50">{data.nombre}</div>
			</div>

			<!-- QR -->
			<button
				type="button"
				onclick={() => (fullscreen = true)}
				class="block w-full bg-white p-4 transition-colors hover:bg-stone-50"
				title="Tap para mostrar en pantalla completa"
			>
				<div class="mx-auto aspect-square max-w-[320px]">{@html data.qrSvg}</div>
				<div class="mt-2 text-center text-[11px] font-medium text-stone-500">
					Tap para mostrar pantalla completa
				</div>
			</button>

			<!-- Botones de acción -->
			<div class="space-y-2 border-t border-stone-100 bg-stone-50 p-4">
				<a
					href="https://wa.me/?text={waText}"
					target="_blank"
					rel="noopener"
					onclick={() => track('share_mi_qr', { method: 'whatsapp' })}
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
				>
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor"><path d="M.057 24l1.687-6.163a11.87 11.87 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607z"/></svg>
					Compartir por WhatsApp
				</a>

				<button
					type="button"
					onclick={copiar}
					class="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-100"
				>
					{copiado ? '✓ Copiado al portapapeles' : 'Copiar link'}
				</button>
			</div>

			<!-- URL en footer -->
			<div class="border-t border-stone-100 bg-white px-4 py-3 text-center">
				<div class="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] text-stone-500">
					{data.compartirUrl.replace(/^https?:\/\//, '')}
				</div>
			</div>
		</div>

		<!-- Cómo funciona -->
		<div class="mt-5 rounded-xl border border-stone-200 bg-white p-4">
			<h2 class="text-sm font-semibold text-stone-900">Cómo funciona</h2>
			<ol class="mt-2 space-y-1.5 text-xs text-stone-600">
				<li class="flex gap-2">
					<span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-stone-950">1</span>
					Mostrale el QR a otro coleccionista (o mandale el link por WhatsApp).
				</li>
				<li class="flex gap-2">
					<span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-stone-950">2</span>
					Él/ella pega su lista de faltantes y repetidas.
				</li>
				<li class="flex gap-2">
					<span class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-400 text-[10px] font-bold text-stone-950">3</span>
					Te queda en <a href="/intercambios" class="font-semibold text-stone-900 underline">Intercambios</a> con el matcher óptimo.
				</li>
			</ol>
		</div>

		{#if data.esLocalhost}
			<div class="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
				<strong>Heads-up:</strong> estás en <code>localhost</code>. Este QR sólo funciona en esta
				máquina; para probarlo desde un celular usá la app deployada.
			</div>
		{/if}
	</div>
</div>

<!-- Fullscreen QR para mostrar en persona -->
{#if fullscreen}
	<button
		type="button"
		onclick={() => (fullscreen = false)}
		class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6"
		aria-label="Cerrar pantalla completa"
	>
		<div class="text-center">
			<div class="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
				Escaneá para cambiar conmigo
			</div>
			<div class="mt-1 text-3xl font-black text-stone-900">{data.nombre}</div>
		</div>
		<div class="mt-6 w-full max-w-[min(85vh,85vw)]">{@html data.qrSvg}</div>
		<div class="mt-6 text-xs text-stone-400">Tap para cerrar</div>
	</button>
{/if}
