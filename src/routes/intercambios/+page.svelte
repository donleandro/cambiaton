<script lang="ts">
	import { track } from '$lib/client/track';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Filtro = 'pendiente' | 'aplicado' | 'archivado' | 'todos';
	let filtro = $state<Filtro>('pendiente');

	const visibles = $derived(
		filtro === 'todos'
			? data.intercambios
			: data.intercambios.filter((i) => i.status === filtro)
	);

	const STATUS_TONE: Record<string, string> = {
		pendiente: 'bg-amber-100 text-amber-800',
		aplicado: 'bg-emerald-100 text-emerald-800',
		archivado: 'bg-stone-100 text-stone-500'
	};
</script>

<svelte:head><title>Intercambios recibidos · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
		<div class="mx-auto max-w-4xl px-4 py-3">
			<div class="flex items-center justify-between">
				<h1 class="text-lg font-bold tracking-tight">Intercambios recibidos</h1>
				<a href="/" class="text-sm text-stone-600 hover:text-stone-900">← Catálogo</a>
			</div>
			<div class="mt-3 flex gap-1 rounded-lg bg-stone-200 p-1 text-sm">
				{#each [{ k: 'pendiente', label: `Pendientes (${data.stats.pendientes})` }, { k: 'aplicado', label: `Aplicados (${data.stats.aplicados})` }, { k: 'archivado', label: `Archivados (${data.stats.archivados})` }, { k: 'todos', label: `Todos (${data.stats.total})` }] as opt (opt.k)}
					<button
						onclick={() => {
							filtro = opt.k as Filtro;
							track('intercambios_filtro', { filtro: opt.k });
						}}
						class="flex-1 rounded-md px-3 py-1.5 transition-colors {filtro === opt.k
							? 'bg-white font-semibold text-stone-900 shadow-sm'
							: 'text-stone-600 hover:text-stone-900'}"
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-4 py-5">
		{#if visibles.length === 0}
			<div class="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
				No hay intercambios {filtro === 'todos' ? '' : `${filtro}s`}.
				<div class="mt-2 text-xs">
					Cuando alguien comparta su lista vía <a href="/compartir" class="underline">/compartir</a> aparece acá.
				</div>
			</div>
		{:else}
			<ul class="space-y-2">
				{#each visibles as it (it.id)}
					<li>
						<a
							href="/intercambio/{it.id}"
							class="block rounded-lg border border-stone-200 bg-white p-3 transition-colors hover:border-stone-400 hover:bg-stone-50"
						>
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<div class="flex items-center gap-2">
									<span class="font-semibold">{it.nombre}</span>
									<span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {STATUS_TONE[it.status]}">
										{it.status}
									</span>
									{#if it.origen === 'publico'}
										<span class="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
											público
										</span>
									{/if}
								</div>
								<span class="text-xs text-stone-500">
									{new Date(it.fecha).toLocaleString('es-MX')}
								</span>
							</div>
							<div class="mt-1 flex flex-wrap gap-3 text-xs text-stone-600">
								<span>
									<strong class="text-amber-700">{it.doy}</strong> yo doy
								</span>
								<span>·</span>
								<span>
									<strong class="text-emerald-700">{it.recibo}</strong> recibo
								</span>
								<span>·</span>
								<span>balanceado <strong>{it.balanceado}</strong></span>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>
