<script lang="ts">
	import { track } from '$lib/client/track';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Orden = 'album' | 'menos' | 'mas' | 'az';
	let orden = $state<Orden>('menos');

	let copiado = $state<'faltantes' | 'repetidas' | null>(null);
	async function copiar(qué: 'faltantes' | 'repetidas') {
		const texto = qué === 'faltantes' ? data.exportFaltantes : data.exportRepetidas;
		try {
			await navigator.clipboard.writeText(texto);
			copiado = qué;
			track('export_figuritas_copy', { kind: qué });
			setTimeout(() => (copiado = null), 2000);
		} catch {
			alert('No se pudo copiar. Seleccioná y copiá manualmente.');
		}
	}

	const equiposOrdenados = $derived.by(() => {
		const arr = [...data.porEquipo].filter((e) => e.confederacion !== 'Global');
		if (orden === 'album') return arr.sort((a, b) => a.posicion - b.posicion);
		if (orden === 'az') return arr.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
		if (orden === 'menos') return arr.sort((a, b) => a.pct - b.pct);
		return arr.sort((a, b) => b.pct - a.pct);
	});

	function colorPct(p: number): string {
		if (p === 100) return 'bg-emerald-500';
		if (p >= 75) return 'bg-emerald-400';
		if (p >= 50) return 'bg-amber-400';
		if (p >= 25) return 'bg-orange-400';
		return 'bg-rose-400';
	}

	// Ring chart math
	const RING_R = 72;
	const RING_C = 2 * Math.PI * RING_R;
	const ringOffset = $derived(RING_C * (1 - data.general.pct / 100));
</script>

<svelte:head><title>Reportes · Cambiatón</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<div class="border-b border-stone-200 bg-white">
		<div class="mx-auto max-w-5xl px-4 py-3">
			<h1 class="text-lg font-bold tracking-tight">Reportes</h1>
		</div>
	</div>

	<div class="mx-auto max-w-5xl space-y-8 px-4 py-6">
		<!-- HERO RING -->
		<section
			class="overflow-hidden rounded-2xl border border-stone-200 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800 p-6 text-stone-100 shadow-sm"
		>
			<div class="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
				<!-- Ring -->
				<div class="relative grid h-44 w-44 shrink-0 place-items-center">
					<svg viewBox="0 0 180 180" class="h-full w-full -rotate-90">
						<circle
							cx="90"
							cy="90"
							r={RING_R}
							fill="none"
							stroke="#27272a"
							stroke-width="14"
						/>
						<circle
							cx="90"
							cy="90"
							r={RING_R}
							fill="none"
							stroke="#fbbf24"
							stroke-width="14"
							stroke-linecap="round"
							stroke-dasharray={RING_C}
							stroke-dashoffset={ringOffset}
							style="transition: stroke-dashoffset 600ms cubic-bezier(0.2, 0.8, 0.2, 1);"
						/>
					</svg>
					<div class="absolute inset-0 grid place-items-center">
						<div class="text-center">
							<div class="text-4xl font-black tabular-nums leading-none text-amber-400">
								{data.general.pct.toFixed(0)}%
							</div>
							<div class="mt-1 text-[10px] font-semibold uppercase tracking-wider text-stone-400">
								Completo
							</div>
						</div>
					</div>
				</div>

				<!-- Stats compactas -->
				<div class="flex-1 space-y-3 self-center">
					<div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">
						Tu álbum
					</div>
					<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
						<span class="text-3xl font-black tabular-nums">{data.general.tengo}</span>
						<span class="text-base text-stone-400">de {data.general.total} stickers</span>
					</div>
					<div class="grid grid-cols-3 gap-2 pt-2">
						<div class="rounded-lg border border-stone-700 bg-stone-900/60 p-2">
							<div class="text-[10px] uppercase tracking-wider text-stone-400">Faltan</div>
							<div class="mt-0.5 text-xl font-bold tabular-nums text-rose-400">
								{data.general.faltan}
							</div>
						</div>
						<div class="rounded-lg border border-stone-700 bg-stone-900/60 p-2">
							<div class="text-[10px] uppercase tracking-wider text-stone-400">Repetidas</div>
							<div class="mt-0.5 text-xl font-bold tabular-nums text-amber-300">
								{data.general.repetidas}
							</div>
						</div>
						<div class="rounded-lg border border-stone-700 bg-stone-900/60 p-2">
							<div class="text-[10px] uppercase tracking-wider text-stone-400">Equipos OK</div>
							<div class="mt-0.5 text-xl font-bold tabular-nums">
								{data.general.equiposCompletos}<span class="text-sm text-stone-500">/{data.general.equiposReales}</span>
							</div>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-2 pt-1">
						<div class="rounded-lg border border-stone-700 bg-stone-900/60 p-2.5">
							<div class="text-[10px] uppercase tracking-wider text-stone-400">Sobres realista</div>
							<div class="mt-0.5 flex items-baseline gap-1.5">
								<span class="text-lg font-bold tabular-nums">{data.general.sobresEstimados}</span>
								<span class="text-[10px] text-stone-500">aprox.</span>
							</div>
						</div>
						<div class="rounded-lg border border-stone-700 bg-stone-900/60 p-2.5">
							<div class="text-[10px] uppercase tracking-wider text-stone-400">Sobres optimista</div>
							<div class="mt-0.5 flex items-baseline gap-1.5">
								<span class="text-lg font-bold tabular-nums">{data.general.sobresOptimistas}</span>
								<span class="text-[10px] text-stone-500">60% nuevos</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- A UN PASO -->
		{#if data.aUnPaso.length > 0}
			<section>
				<div class="mb-3 flex items-baseline justify-between">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-stone-500">A un paso</h2>
					<span class="text-xs text-stone-500">≤ 3 stickers para completar</span>
				</div>

				<div class="grid gap-2.5 sm:grid-cols-2">
					{#each data.aUnPaso as e (e.nombre)}
						<a
							href="/?filter=faltantes&equipo={encodeURIComponent(e.nombre)}"
							class="group flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3 transition-colors hover:bg-amber-50"
						>
							<div class="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-amber-400 text-lg font-black text-stone-950">
								{e.faltan}
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex items-baseline gap-2">
									<span class="truncate font-bold text-stone-900">{e.nombre}</span>
									{#if e.grupo}
										<span class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[9px] font-bold text-white">
											{e.grupo}
										</span>
									{/if}
								</div>
								<div class="mt-0.5 font-mono text-[11px] text-stone-600">
									Faltan {e.stickersFaltan.map((s) => s.id).join(', ')}
								</div>
							</div>
							<svg class="h-4 w-4 text-stone-400 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
						</a>
					{/each}
				</div>
			</section>
		{/if}

		<!-- POR GRUPO MUNDIAL -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
				Por grupo del Mundial
			</h2>
			<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
				{#each data.porGrupo as g (g.letra)}
					<div class="rounded-xl border border-stone-200 bg-white p-3">
						<div class="flex items-center justify-between">
							<span class="grid h-7 w-7 place-items-center rounded-md bg-stone-900 font-mono text-xs font-bold text-white">
								{g.letra}
							</span>
							<span class="font-mono text-sm font-bold tabular-nums {g.pct === 100 ? 'text-emerald-600' : 'text-stone-700'}">
								{g.pct.toFixed(0)}%
							</span>
						</div>
						<div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
							<div class="h-full {colorPct(g.pct)} transition-all" style="width: {g.pct}%"></div>
						</div>
						<div class="mt-2 flex items-baseline justify-between text-[11px] text-stone-500">
							<span>{g.tengo} / {g.total}</span>
							<span class="font-mono">
								{#if g.repetidas > 0}+{g.repetidas} rep{/if}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- POR CONFEDERACIÓN -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
				Por confederación
			</h2>
			<div class="overflow-x-auto rounded-xl border border-stone-200 bg-white">
				<table class="w-full text-sm">
					<thead class="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
						<tr>
							<th class="px-3 py-2 text-left">Confederación</th>
							<th class="px-3 py-2 text-right">Tengo</th>
							<th class="px-3 py-2 text-right">Faltan</th>
							<th class="px-3 py-2 text-right">Repetidas</th>
							<th class="px-3 py-2 text-right">%</th>
							<th class="hidden px-3 py-2 sm:table-cell">Progreso</th>
						</tr>
					</thead>
					<tbody>
						{#each data.porConfederacion as c (c.nombre)}
							<tr class="border-b border-stone-100 last:border-b-0">
								<td class="px-3 py-2 font-semibold">{c.nombre}</td>
								<td class="px-3 py-2 text-right font-mono tabular-nums">{c.tengo}/{c.total}</td>
								<td
									class="px-3 py-2 text-right font-mono tabular-nums {c.faltan === 0
										? 'text-stone-400'
										: 'text-rose-600'}"
								>{c.faltan}</td>
								<td
									class="px-3 py-2 text-right font-mono tabular-nums {c.repetidas === 0
										? 'text-stone-400'
										: 'text-amber-700'}"
								>{c.repetidas}</td>
								<td class="px-3 py-2 text-right font-mono font-semibold tabular-nums">{c.pct.toFixed(1)}%</td>
								<td class="hidden px-3 py-2 sm:table-cell">
									<div class="h-2 w-32 overflow-hidden rounded-full bg-stone-100">
										<div class="h-full {colorPct(c.pct)}" style="width: {c.pct}%"></div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<!-- TOP REPETIDAS -->
		{#if data.topRepetidas.length > 0}
			<section>
				<div class="mb-3 flex items-baseline justify-between">
					<h2 class="text-sm font-semibold uppercase tracking-wider text-stone-500">
						Top repetidas
					</h2>
					<span class="text-xs text-stone-500">Tus mejores cartas para cambiar</span>
				</div>
				<div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
					{#each data.topRepetidas as r (r.id)}
						<div class="rounded-lg border border-amber-200 bg-amber-50 p-2">
							<div class="flex items-baseline justify-between">
								<span class="font-mono text-xs font-bold text-stone-900">{r.id}</span>
								<span class="text-base font-black tabular-nums text-amber-700">×{r.repetidas}</span>
							</div>
							<div class="mt-0.5 truncate text-[11px] text-stone-600" title={r.equipo}>{r.equipo}</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- EXPORTAR -->
		<section>
			<h2 class="mb-1 text-sm font-semibold uppercase tracking-wider text-stone-500">
				Compartir mi lista (formato Figuritas)
			</h2>
			<p class="mb-3 text-xs text-stone-600">
				Copialo y pegáselo a otra persona — el formato es compatible con la app Figuritas y similares.
			</p>

			<div class="grid gap-3 md:grid-cols-2">
				<div class="rounded-xl border border-rose-200 bg-white">
					<div class="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-3 py-2">
						<span class="text-sm font-semibold text-rose-700">Mis faltantes ({data.general.faltan})</span>
						<button
							type="button"
							onclick={() => copiar('faltantes')}
							class="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
						>
							{copiado === 'faltantes' ? '✓ Copiado' : 'Copiar'}
						</button>
					</div>
					<textarea
						readonly
						rows="10"
						class="w-full resize-y border-0 bg-white p-3 font-mono text-xs focus:outline-none"
						value={data.exportFaltantes}
					></textarea>
				</div>

				<div class="rounded-xl border border-amber-200 bg-white">
					<div class="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-3 py-2">
						<span class="text-sm font-semibold text-amber-700">Mis repetidas ({data.general.repetidas})</span>
						<button
							type="button"
							onclick={() => copiar('repetidas')}
							class="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
						>
							{copiado === 'repetidas' ? '✓ Copiado' : 'Copiar'}
						</button>
					</div>
					<textarea
						readonly
						rows="10"
						class="w-full resize-y border-0 bg-white p-3 font-mono text-xs focus:outline-none"
						value={data.exportRepetidas}
					></textarea>
				</div>
			</div>
		</section>

		<!-- POR EQUIPO -->
		<section>
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-sm font-semibold uppercase tracking-wider text-stone-500">Por equipo</h2>
				<div class="flex gap-1 rounded-lg bg-stone-200 p-1 text-xs">
					<button
						onclick={() => (orden = 'menos')}
						class="rounded px-2 py-1 transition-colors {orden === 'menos'
							? 'bg-white font-semibold'
							: 'text-stone-600'}">Menos completos</button
					>
					<button
						onclick={() => (orden = 'mas')}
						class="rounded px-2 py-1 transition-colors {orden === 'mas'
							? 'bg-white font-semibold'
							: 'text-stone-600'}">Más completos</button
					>
					<button
						onclick={() => (orden = 'album')}
						class="rounded px-2 py-1 transition-colors {orden === 'album'
							? 'bg-white font-semibold'
							: 'text-stone-600'}">Orden Mundial</button
					>
					<button
						onclick={() => (orden = 'az')}
						class="rounded px-2 py-1 transition-colors {orden === 'az'
							? 'bg-white font-semibold'
							: 'text-stone-600'}">A–Z</button
					>
				</div>
			</div>

			<div class="overflow-x-auto rounded-xl border border-stone-200 bg-white">
				<table class="w-full text-sm">
					<thead class="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
						<tr>
							<th class="px-3 py-2 text-left">Equipo</th>
							<th class="px-3 py-2 text-center">Grupo</th>
							<th class="px-3 py-2 text-left">Conf.</th>
							<th class="px-3 py-2 text-right">Tengo</th>
							<th class="px-3 py-2 text-right">Faltan</th>
							<th class="px-3 py-2 text-right">Repetidas</th>
							<th class="px-3 py-2 text-right">%</th>
							<th class="hidden px-3 py-2 md:table-cell">Progreso</th>
						</tr>
					</thead>
					<tbody>
						{#each equiposOrdenados as e (e.nombre)}
							<tr class="border-b border-stone-100 last:border-b-0 {e.pct === 100 ? 'bg-emerald-50/50' : ''}">
								<td class="px-3 py-2 font-medium">
									<a href="/?equipo={encodeURIComponent(e.nombre)}" class="hover:underline">
										{e.nombre}
									</a>
								</td>
								<td class="px-3 py-2 text-center">
									{#if e.grupo}
										<span class="rounded bg-stone-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
											{e.grupo}
										</span>
									{:else}
										<span class="text-stone-300">—</span>
									{/if}
								</td>
								<td class="px-3 py-2 text-xs text-stone-500">{e.confederacion}</td>
								<td class="px-3 py-2 text-right font-mono tabular-nums">{e.tengo}/{e.total}</td>
								<td
									class="px-3 py-2 text-right font-mono tabular-nums {e.faltan === 0
										? 'text-stone-400'
										: 'text-rose-600'}"
								>{e.faltan}</td>
								<td
									class="px-3 py-2 text-right font-mono tabular-nums {e.repetidas === 0
										? 'text-stone-400'
										: 'text-amber-700'}"
								>{e.repetidas}</td>
								<td class="px-3 py-2 text-right font-mono font-semibold tabular-nums">
									{#if e.pct === 100}
										<span class="text-emerald-600">✓ 100%</span>
									{:else}
										{e.pct.toFixed(0)}%
									{/if}
								</td>
								<td class="hidden px-3 py-2 md:table-cell">
									<div class="h-2 w-32 overflow-hidden rounded-full bg-stone-100">
										<div class="h-full {colorPct(e.pct)}" style="width: {e.pct}%"></div>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</div>
</div>
