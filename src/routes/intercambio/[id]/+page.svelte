<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let seleccionDoy = $state<Set<string>>(
		new Set(data.match.doy.slice(0, data.match.balanceado).map((it) => it.id))
	);
	let seleccionRecibo = $state<Set<string>>(
		new Set(data.match.recibo.slice(0, data.match.balanceado).map((it) => it.id))
	);

	function toggle(set: Set<string>, id: string) {
		if (set.has(id)) set.delete(id);
		else set.add(id);
		return new Set(set);
	}
</script>

<svelte:head><title>Intercambio · {data.importacion.nombre}</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
			<div>
				<h1 class="text-xl font-bold tracking-tight">Intercambio con {data.importacion.nombre}</h1>
				<p class="text-xs text-stone-500">
					{new Date(data.importacion.fecha).toLocaleString('es-MX')} ·
					Balanceado óptimo: <strong>{data.match.balanceado}</strong>
				</p>
			</div>
			<div class="flex gap-3 text-sm">
				<a href="/importar" class="text-stone-600 hover:text-stone-900">+ Nuevo</a>
				<a href="/" class="text-stone-600 hover:text-stone-900">← Catálogo</a>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-5xl px-4 py-6">
		{#if form?.ok}
			<div class="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
				✓ Intercambio aplicado. {form.dados} dados (−1 repetida) y {form.recibidos} recibidos (marcados como tengo).
			</div>
		{:else if form?.error}
			<div class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
				{form.error}
			</div>
		{/if}

		{#if data.match.doy.length === 0 && data.match.recibo.length === 0}
			<div class="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500">
				No hay match: ninguno de los stickers cruza entre lo que vos repetís y lo que él/ella necesita,
				ni viceversa.
			</div>
		{:else}
			<form
				method="POST"
				action="?/confirmar"
				use:enhance
				class="space-y-6"
			>
				<input type="hidden" name="dados" value={[...seleccionDoy].join(',')} />
				<input type="hidden" name="recibidos" value={[...seleccionRecibo].join(',')} />

				<div class="grid gap-6 md:grid-cols-2">
					<section>
						<div class="mb-2 flex items-baseline justify-between">
							<h2 class="text-base font-semibold">
								Yo le doy
								<span class="text-sm font-normal text-stone-500">
									({seleccionDoy.size} de {data.totales.doy})
								</span>
							</h2>
							<button
								type="button"
								onclick={() =>
									(seleccionDoy = new Set(
										seleccionDoy.size === data.match.doy.length
											? []
											: data.match.doy.map((it) => it.id)
									))}
								class="text-xs text-stone-500 hover:text-stone-900"
							>
								{seleccionDoy.size === data.match.doy.length ? 'Ninguno' : 'Todos'}
							</button>
						</div>
						<ul class="space-y-1">
							{#each data.match.doy as it (it.id)}
								<li>
									<label
										class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors {seleccionDoy.has(
											it.id
										)
											? 'border-amber-300 bg-amber-50'
											: 'border-stone-200 bg-white hover:bg-stone-50'}"
									>
										<input
											type="checkbox"
											checked={seleccionDoy.has(it.id)}
											onchange={() => (seleccionDoy = toggle(seleccionDoy, it.id))}
											class="h-4 w-4 accent-amber-600"
										/>
										{#if it.grupo}
											<span
												class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
												>{it.grupo}</span
											>
										{/if}
										<span class="font-mono text-sm font-semibold">{it.id}</span>
										<span class="flex-1 truncate text-stone-600">{it.equipo}</span>
										<span class="text-xs text-stone-500">#{it.numero}</span>
										{#if it.cantidad > 1}
											<span class="rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800"
												>×{it.cantidad}</span
											>
										{/if}
									</label>
								</li>
							{:else}
								<li class="rounded-md border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
									No tenés repetidas que él/ella necesite.
								</li>
							{/each}
						</ul>
					</section>

					<section>
						<div class="mb-2 flex items-baseline justify-between">
							<h2 class="text-base font-semibold">
								Él/ella me da
								<span class="text-sm font-normal text-stone-500">
									({seleccionRecibo.size} de {data.totales.recibo})
								</span>
							</h2>
							<button
								type="button"
								onclick={() =>
									(seleccionRecibo = new Set(
										seleccionRecibo.size === data.match.recibo.length
											? []
											: data.match.recibo.map((it) => it.id)
									))}
								class="text-xs text-stone-500 hover:text-stone-900"
							>
								{seleccionRecibo.size === data.match.recibo.length ? 'Ninguno' : 'Todos'}
							</button>
						</div>
						<ul class="space-y-1">
							{#each data.match.recibo as it (it.id)}
								<li>
									<label
										class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors {seleccionRecibo.has(
											it.id
										)
											? 'border-emerald-300 bg-emerald-50'
											: 'border-stone-200 bg-white hover:bg-stone-50'}"
									>
										<input
											type="checkbox"
											checked={seleccionRecibo.has(it.id)}
											onchange={() =>
												(seleccionRecibo = toggle(seleccionRecibo, it.id))}
											class="h-4 w-4 accent-emerald-600"
										/>
										{#if it.grupo}
											<span
												class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
												>{it.grupo}</span
											>
										{/if}
										<span class="font-mono text-sm font-semibold">{it.id}</span>
										<span class="flex-1 truncate text-stone-600">{it.equipo}</span>
										<span class="text-xs text-stone-500">#{it.numero}</span>
										{#if it.cantidad > 1}
											<span class="rounded bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-800"
												>×{it.cantidad}</span
											>
										{/if}
									</label>
								</li>
							{:else}
								<li class="rounded-md border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
									Ninguna de sus repetidas te falta.
								</li>
							{/each}
						</ul>
					</section>
				</div>

				<div class="sticky bottom-0 -mx-4 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="text-sm text-stone-600">
							{#if seleccionDoy.size !== seleccionRecibo.size}
								<span class="text-amber-700">
									Desbalanceado: {seleccionDoy.size} dados vs {seleccionRecibo.size} recibidos
								</span>
							{:else}
								<span class="text-emerald-700">
									Balanceado: {seleccionDoy.size} ↔ {seleccionRecibo.size}
								</span>
							{/if}
						</div>
						<button
							type="submit"
							disabled={seleccionDoy.size === 0 && seleccionRecibo.size === 0}
							class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-40"
						>
							Aplicar intercambio
						</button>
					</div>
				</div>
			</form>
		{/if}
	</div>
</div>
