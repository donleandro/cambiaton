<script lang="ts">
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
</script>

<svelte:head><title>Reportes · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
		<div class="mx-auto max-w-5xl px-4 py-3">
			<div class="flex items-center justify-between">
				<h1 class="text-lg font-bold tracking-tight">Reportes</h1>
				<a href="/" class="text-sm text-stone-600 hover:text-stone-900">← Catálogo</a>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-5xl space-y-8 px-4 py-6">
		<!-- GENERAL -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">General</h2>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				<div class="rounded-lg border border-stone-200 bg-white p-3">
					<div class="text-xs text-stone-500">Total álbum</div>
					<div class="text-2xl font-bold tabular-nums">{data.general.total}</div>
				</div>
				<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
					<div class="text-xs text-emerald-700">Tengo</div>
					<div class="text-2xl font-bold tabular-nums text-emerald-700">{data.general.tengo}</div>
				</div>
				<div class="rounded-lg border border-rose-200 bg-rose-50 p-3">
					<div class="text-xs text-rose-700">Me faltan</div>
					<div class="text-2xl font-bold tabular-nums text-rose-700">{data.general.faltan}</div>
				</div>
				<div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
					<div class="text-xs text-amber-700">Repetidas</div>
					<div class="text-2xl font-bold tabular-nums text-amber-700">{data.general.repetidas}</div>
				</div>
				<div class="rounded-lg border border-stone-200 bg-white p-3">
					<div class="text-xs text-stone-500">Equipos completos</div>
					<div class="text-2xl font-bold tabular-nums">
						{data.general.equiposCompletos}<span class="text-base text-stone-400">/{data.general.equiposReales}</span>
					</div>
				</div>
				<div class="rounded-lg border border-stone-900 bg-stone-900 p-3 text-white">
					<div class="text-xs text-stone-300">% completado</div>
					<div class="text-2xl font-bold tabular-nums">{data.general.pct.toFixed(1)}%</div>
				</div>
			</div>

			<div class="mt-4 rounded-lg border border-stone-200 bg-white p-4">
				<div class="mb-2 flex items-baseline justify-between">
					<span class="text-xs font-semibold uppercase tracking-wider text-stone-500">Progreso visual</span>
					<span class="font-mono text-xs text-stone-500">{data.general.tengo} / {data.general.total}</span>
				</div>
				<div class="h-4 w-full overflow-hidden rounded-full bg-stone-100">
					<div
						class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
						style="width: {data.general.pct}%"
					></div>
				</div>
				<div class="mt-2 font-mono text-xs text-stone-500">
					{'█'.repeat(Math.floor(data.general.pct / 5))}{'░'.repeat(
						20 - Math.floor(data.general.pct / 5)
					)} {data.general.pct.toFixed(1)}%
				</div>
			</div>

			<div class="mt-3 grid gap-3 sm:grid-cols-2">
				<div class="rounded-lg border border-stone-200 bg-white p-4">
					<div class="text-xs font-semibold uppercase tracking-wider text-stone-500">Sobres estimados (realista)</div>
					<div class="mt-1 text-3xl font-bold tabular-nums">{data.general.sobresEstimados}</div>
					<div class="mt-1 text-xs text-stone-500">
						A 7 stickers/sobre, asumiendo {(((data.general.faltan / data.general.total) * 100) || 0).toFixed(0)}% nuevos
						(tu progreso actual).
					</div>
				</div>
				<div class="rounded-lg border border-stone-200 bg-white p-4">
					<div class="text-xs font-semibold uppercase tracking-wider text-stone-500">Sobres optimistas</div>
					<div class="mt-1 text-3xl font-bold tabular-nums">{data.general.sobresOptimistas}</div>
					<div class="mt-1 text-xs text-stone-500">
						Si fueran 60% nuevos por sobre (regla del Excel original).
					</div>
				</div>
			</div>
		</section>

		<!-- POR CONFEDERACIÓN -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">Por confederación</h2>

			<div class="overflow-x-auto rounded-lg border border-stone-200 bg-white">
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
								<td class="px-3 py-2 text-right font-mono tabular-nums {c.faltan === 0 ? 'text-stone-400' : 'text-rose-600'}"
									>{c.faltan}</td
								>
								<td class="px-3 py-2 text-right font-mono tabular-nums {c.repetidas === 0 ? 'text-stone-400' : 'text-amber-700'}"
									>{c.repetidas}</td
								>
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

		<!-- EXPORTAR -->
		<section>
			<h2 class="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
				Compartir mi lista (formato Figuritas)
			</h2>
			<p class="mb-3 text-xs text-stone-600">
				Copialo y pegáselo a otra persona — el formato es compatible con la app Figuritas y similares.
			</p>

			<div class="grid gap-3 md:grid-cols-2">
				<div class="rounded-lg border border-rose-200 bg-white">
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

				<div class="rounded-lg border border-amber-200 bg-white">
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

			<div class="overflow-x-auto rounded-lg border border-stone-200 bg-white">
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
										<span class="rounded bg-stone-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white"
											>{e.grupo}</span
										>
									{:else}
										<span class="text-stone-300">—</span>
									{/if}
								</td>
								<td class="px-3 py-2 text-xs text-stone-500">{e.confederacion}</td>
								<td class="px-3 py-2 text-right font-mono tabular-nums">{e.tengo}/{e.total}</td>
								<td class="px-3 py-2 text-right font-mono tabular-nums {e.faltan === 0 ? 'text-stone-400' : 'text-rose-600'}"
									>{e.faltan}</td
								>
								<td class="px-3 py-2 text-right font-mono tabular-nums {e.repetidas === 0 ? 'text-stone-400' : 'text-amber-700'}"
									>{e.repetidas}</td
								>
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
