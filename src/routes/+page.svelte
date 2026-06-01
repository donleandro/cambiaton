<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { track } from '$lib/client/track';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Filter = 'todos' | 'faltantes' | 'repetidas';
	type Sort = 'mundial' | 'az';
	const initialParams = page.url.searchParams;
	let filter = $state<Filter>((initialParams.get('filter') as Filter) ?? 'todos');
	let sort = $state<Sort>('mundial');
	let search = $state('');
	let confederacion = $state<string>(initialParams.get('confederacion') ?? '');
	let equipo = $state<string>(initialParams.get('equipo') ?? '');
	let grupo = $state<string>(initialParams.get('grupo') ?? '');

	const visible = $derived(
		data.stickers.filter((s) => {
			if (filter === 'faltantes' && s.tengo) return false;
			if (filter === 'repetidas' && s.repetidas === 0) return false;
			if (confederacion && s.confederacion !== confederacion) return false;
			if (equipo && s.equipo !== equipo) return false;
			if (grupo && s.grupo !== grupo) return false;
			if (search) {
				const q = search.toLowerCase();
				if (
					!s.id.toLowerCase().includes(q) &&
					!s.equipo.toLowerCase().includes(q) &&
					!String(s.numero).includes(q)
				)
					return false;
			}
			return true;
		})
	);

	const grouped = $derived(
		visible.reduce(
			(acc, s) => {
				(acc[s.equipo] ??= []).push(s);
				return acc;
			},
			{} as Record<string, typeof data.stickers>
		)
	);

	const equipoOrder = $derived.by(() => {
		const equipos = Object.keys(grouped);
		if (sort === 'az') return equipos.sort((a, b) => a.localeCompare(b, 'es'));
		// Orden del Mundial: por posición oficial del sorteo (pot 1→4 dentro de
		// cada grupo). Equipos no listados (Introducción, Leyendas) → Infinity,
		// quedan al final.
		return equipos.sort((a, b) => {
			const pa = grouped[a][0].posicion;
			const pb = grouped[b][0].posicion;
			if (pa !== pb) return pa - pb;
			// Ambos sin posición: ordenar por menor numero (Intro antes que Leyendas)
			const na = grouped[a].reduce((m, s) => (s.numero < m ? s.numero : m), Infinity);
			const nb = grouped[b].reduce((m, s) => (s.numero < m ? s.numero : m), Infinity);
			return na - nb;
		});
	});

	const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

	const pct = $derived(data.stats.total > 0 ? (data.stats.tengo / data.stats.total) * 100 : 0);
</script>

<svelte:head><title>Álbum Panini Mundial 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<!-- Stats bar específica del catálogo. El branding/nav lo aporta el AppHeader global. -->
	<div class="border-b border-stone-200 bg-white/90 backdrop-blur">
		<div class="mx-auto max-w-6xl px-4 py-3">
			<div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-stone-600">
				<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
					<span><span class="font-bold text-stone-900">{data.stats.tengo}</span><span class="text-stone-400">/{data.stats.total}</span></span>
					<span class="text-stone-300">·</span>
					<span>faltan <span class="font-semibold text-rose-600">{data.stats.faltan}</span></span>
					<span class="text-stone-300">·</span>
					<span>repetidas <span class="font-semibold text-amber-700">{data.stats.repetidasTotal}</span></span>
				</div>
				<span class="font-semibold text-stone-900">{pct.toFixed(0)}%</span>
			</div>
			<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
				<div
					class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
					style="width: {pct}%"
				></div>
			</div>

			<div class="mt-3 flex flex-wrap gap-2">
				<input
					type="search"
					placeholder="Buscar por ID, equipo o número…"
					bind:value={search}
					class="min-w-[180px] flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
				/>
				<select
					bind:value={confederacion}
					class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
				>
					<option value="">Confed.</option>
					{#each data.confederaciones as c (c)}
						<option value={c}>{c}</option>
					{/each}
				</select>
				<select bind:value={grupo} class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
					<option value="">Grupo</option>
					{#each GRUPOS as g (g)}
						<option value={g}>Grupo {g}</option>
					{/each}
				</select>
				<select bind:value={equipo} class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
					<option value="">Equipo</option>
					{#each data.equipos as e (e)}
						<option value={e}>{e}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	<div class="mx-auto max-w-6xl px-4 py-4">

		{#if data.coleccionVacia}
			<div class="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100/60 p-3 text-sm">
				<div class="flex-1">
					<p class="font-semibold text-amber-900">¿Ya usás Figuritas? Importá tu lista.</p>
					<p class="text-xs text-amber-800">
						Pegá tus faltantes y repetidas que ya tenés en esa app y te calculamos tu álbum en
						3 segundos. Más rápido que marcar 980 stickers a mano.
					</p>
				</div>
				<a
					href="/importar"
					class="shrink-0 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800"
				>
					Importar
				</a>
			</div>
		{:else if data.needsClaim}
			<div class="mb-3 flex items-start justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
				<div class="flex-1">
					<p class="font-semibold text-amber-900">Tu cuenta no tiene email todavía.</p>
					<p class="text-xs text-amber-800">
						Agregale email + contraseña para no perder tu colección si cambiás de dispositivo o borrás cookies.
					</p>
				</div>
				<a href="/reclamar" class="shrink-0 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-800">
					Agregar
				</a>
			</div>
		{/if}

		<div class="mb-3 flex flex-wrap gap-3">
			<div class="flex gap-1 rounded-lg bg-stone-200 p-1 text-sm">
				{#each ['todos', 'faltantes', 'repetidas'] as f (f)}
					<button
						onclick={() => {
							filter = f as Filter;
							track('catalog_filter', { filter: f });
						}}
						class="rounded-md px-3 py-1.5 transition-colors {filter === f
							? 'bg-white font-semibold text-stone-900 shadow-sm'
							: 'text-stone-600 hover:text-stone-900'}"
					>
						{f}
					</button>
				{/each}
			</div>

			<div class="flex gap-1 rounded-lg bg-stone-200 p-1 text-sm">
				<button
					onclick={() => { sort = 'mundial'; track('catalog_sort', { sort: 'mundial' }); }}
					class="rounded-md px-3 py-1.5 transition-colors {sort === 'mundial'
						? 'bg-white font-semibold text-stone-900 shadow-sm'
						: 'text-stone-600 hover:text-stone-900'}"
				>
					Orden del Mundial
				</button>
				<button
					onclick={() => { sort = 'az'; track('catalog_sort', { sort: 'az' }); }}
					class="rounded-md px-3 py-1.5 transition-colors {sort === 'az'
						? 'bg-white font-semibold text-stone-900 shadow-sm'
						: 'text-stone-600 hover:text-stone-900'}"
				>
					A–Z
				</button>
			</div>
		</div>

		<div class="mb-3 text-sm text-stone-500">
			Mostrando {visible.length} stickers en {equipoOrder.length} equipos
		</div>

		<div class="space-y-6">
			{#each equipoOrder as eq (eq)}
				{@const lista = grouped[eq]}
				<section>
					<h2 class="mb-2 flex items-baseline justify-between border-b border-stone-200 pb-1">
						<span class="flex items-baseline gap-2">
							{#if lista[0].grupo}
								<span
									class="rounded-md bg-stone-900 px-1.5 py-0.5 font-mono text-xs font-bold tracking-wider text-white"
								>
									{lista[0].grupo}
								</span>
							{/if}
							<span class="text-base font-semibold">{eq}</span>
						</span>
						<span class="text-xs text-stone-500">
							{lista.filter((s) => s.tengo).length}/{lista.length} ·
							{lista[0].confederacion}
						</span>
					</h2>
					<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
						{#each lista as s (s.id)}
							<div
								class="flex flex-col rounded-lg border p-2 transition-colors {s.tengo
									? 'border-emerald-300 bg-emerald-50'
									: 'border-rose-200 bg-rose-50'}"
							>
								<div class="flex items-center justify-between gap-1">
									<div class="min-w-0">
										<div class="font-mono text-sm font-bold text-stone-900">{s.id}</div>
										<div class="text-xs text-stone-500">#{s.numero}</div>
									</div>
									<form
										method="POST"
										action="?/toggleTengo"
										use:enhance={({ formData }) => {
											formData.set('opId', crypto.randomUUID());
											return async ({ result, update }) => {
												await update();
												if (result.type === 'success') track('tengo_toggle', { sticker_id: s.id, to: !s.tengo });
											};
										}}
									>
										<input type="hidden" name="id" value={s.id} />
										<input type="hidden" name="tengo" value={(!s.tengo).toString()} />
										<button
											type="submit"
											class="grid h-8 w-8 place-items-center rounded-md border text-base font-bold transition-colors {s.tengo
												? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
												: 'border-stone-300 bg-white text-stone-400 hover:border-stone-500 hover:text-stone-700'}"
											title={s.tengo ? 'Tengo (clic para quitar)' : 'Marcar como obtenido'}
											aria-label="Toggle tengo"
										>
											✓
										</button>
									</form>
								</div>
								<div
									class="mt-1 flex items-center justify-between gap-1 {s.tengo
										? ''
										: 'pointer-events-none opacity-40'}"
									title={s.tengo ? '' : 'Primero marcalo como obtenido (✓) para registrar repetidas'}
								>
									<form
										method="POST"
										action="?/changeRepetidas"
										use:enhance={({ formData }) => {
											formData.set('opId', crypto.randomUUID());
											return async ({ result, update }) => {
												await update();
												if (result.type === 'success') track('repetidas_delta', { sticker_id: s.id, delta: -1 });
											};
										}}
									>
										<input type="hidden" name="id" value={s.id} />
										<input type="hidden" name="delta" value="-1" />
										<button
											type="submit"
											class="grid h-7 w-7 place-items-center rounded border border-stone-300 bg-white text-base hover:bg-stone-100 disabled:opacity-30"
											disabled={!s.tengo || s.repetidas === 0}
											aria-label="Menos repetida"
										>−</button>
									</form>
									<span
										class="min-w-[1.5rem] text-center text-base font-semibold tabular-nums {s.repetidas >
										0
											? 'text-amber-700'
											: 'text-stone-400'}"
									>
										{s.repetidas}
									</span>
									<form
										method="POST"
										action="?/changeRepetidas"
										use:enhance={({ formData }) => {
											formData.set('opId', crypto.randomUUID());
											return async ({ result, update }) => {
												await update();
												if (result.type === 'success') track('repetidas_delta', { sticker_id: s.id, delta: 1 });
											};
										}}
									>
										<input type="hidden" name="id" value={s.id} />
										<input type="hidden" name="delta" value="1" />
										<button
											type="submit"
											class="grid h-7 w-7 place-items-center rounded border border-stone-300 bg-white text-base hover:bg-stone-100 disabled:opacity-30"
											disabled={!s.tengo}
											aria-label="Más repetida"
										>+</button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}

			{#if equipoOrder.length === 0}
				<div class="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500">
					Sin resultados con los filtros actuales.
				</div>
			{/if}
		</div>
	</div>
</div>
