<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const estadoLabel: Record<string, { label: string; tone: string }> = {
		pendiente: { label: 'Pendiente de revisión', tone: 'bg-amber-100 text-amber-800' },
		aplicado: { label: 'Aplicado ✓', tone: 'bg-emerald-100 text-emerald-800' },
		archivado: { label: 'Archivado', tone: 'bg-stone-100 text-stone-600' }
	};
	const estado = $derived(estadoLabel[data.importacion.status] ?? estadoLabel.pendiente);
</script>

<svelte:head><title>Tu propuesta de intercambio · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto max-w-3xl px-4 py-3">
			<div class="flex items-start justify-between gap-2">
				<div>
					<h1 class="text-lg font-bold tracking-tight">Tu propuesta — {data.importacion.nombre}</h1>
					<p class="text-xs text-stone-500">
						{new Date(data.importacion.fecha).toLocaleString('es-MX')}
					</p>
				</div>
				<span class="rounded-full px-2 py-0.5 text-xs font-semibold {estado.tone}"
					>{estado.label}</span
				>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-3xl px-4 py-5">
		{#if data.puedeReclamar}
			<div class="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4">
				<div class="flex items-start gap-3">
					<div class="flex-1">
						<p class="text-sm font-bold text-emerald-900">
							Guardá tu cuenta para no perder esta colección.
						</p>
						<p class="mt-1 text-xs text-emerald-800">
							Quedaste con sesión iniciada en este dispositivo. Agregá un email y una contraseña y
							vas a poder entrar desde cualquier lado con <code>cambiaton.leandromoreno.com</code> → Entrar.
						</p>
					</div>
					<a
						href={data.reclamarHref}
						class="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800"
					>
						Crear cuenta
					</a>
				</div>
			</div>
		{/if}

		<div class="mb-4 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-700">
			Esto es lo que <strong>el sistema te recomienda</strong> intercambiar con el dueño del álbum.
			Él revisa la lista y la aplica de su lado cuando se hayan dado las cartas en persona.
			{#if data.importacion.status === 'aplicado'}
				<div class="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-emerald-800">
					✓ Ya fue aplicado — los cambios se registraron en su colección.
				</div>
			{:else if data.importacion.status === 'archivado'}
				<div class="mt-2 rounded-md bg-stone-100 px-2 py-1 text-stone-600">
					Este envío fue archivado y no se aplicará.
				</div>
			{/if}
		</div>

		{#if data.match.ellosTeDan.length === 0 && data.match.vosLesDas.length === 0}
			<div class="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500">
				No hubo coincidencias entre tu lista y la colección actual. Intentá más tarde — su
				inventario cambia con el tiempo.
			</div>
		{:else}
			{@const unoAuno = data.match.balanceado}
			{@const nDan = data.match.ellosTeDan.length}
			{@const nDas = data.match.vosLesDas.length}
			<div class="mb-3 rounded-md border border-emerald-200 bg-white p-3 text-sm">
				<div class="flex items-center gap-2 text-base">
					<span class="font-semibold">Cambio 1 a 1:</span>
					<span class="rounded bg-stone-900 px-2 py-0.5 font-bold text-white"
						>{unoAuno} ↔ {unoAuno}</span
					>
				</div>
				<p class="mt-1 text-stone-600">
					Los cambios son siempre 1 a 1. Hay <strong>{nDan}</strong> que te sirven de él y
					<strong>{nDas}</strong> que vos le servís, así que entran <strong>{unoAuno}</strong> de
					cada lado.{#if nDas > unoAuno}
						Se eligen {unoAuno} de tus {nDas} (el resto queda para otra).{/if}{#if nDan > unoAuno}
						Se eligen {unoAuno} de sus {nDan}.{/if}
				</p>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<section>
					<h2 class="mb-2 border-b border-stone-200 pb-1 text-base font-semibold text-emerald-700">
						Ellos te darían
						<span class="text-sm font-normal text-stone-500"
							>({data.match.ellosTeDan
								.length}{#if data.match.ellosTeDan.length > data.match.balanceado}
								· entran {data.match.balanceado}{/if})</span
						>
					</h2>
					<ul class="space-y-1">
						{#each data.match.ellosTeDan as it (it.id)}
							<li
								class="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm"
							>
								{#if it.grupo}
									<span
										class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
										>{it.grupo}</span
									>
								{/if}
								<span class="font-mono text-sm font-bold">{it.id}</span>
								<span class="flex-1 truncate text-stone-700">{it.equipo}</span>
								<span class="text-xs text-stone-500">#{it.numero}</span>
							</li>
						{:else}
							<li
								class="rounded-md border border-dashed border-stone-300 p-3 text-center text-sm text-stone-500"
							>
								Ninguna de sus repetidas te falta.
							</li>
						{/each}
					</ul>
				</section>

				<section>
					<h2 class="mb-2 border-b border-stone-200 pb-1 text-base font-semibold text-amber-700">
						Vos podés darle
						<span class="text-sm font-normal text-stone-500"
							>({data.match.vosLesDas.length} candidatas{#if data.match.vosLesDas.length > data.match.balanceado}
								· entran {data.match.balanceado}{/if})</span
						>
					</h2>
					<ul class="space-y-1">
						{#each data.match.vosLesDas as it (it.id)}
							<li
								class="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm"
							>
								{#if it.grupo}
									<span
										class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
										>{it.grupo}</span
									>
								{/if}
								<span class="font-mono text-sm font-bold">{it.id}</span>
								<span class="flex-1 truncate text-stone-700">{it.equipo}</span>
								<span class="text-xs text-stone-500">#{it.numero}</span>
							</li>
						{:else}
							<li
								class="rounded-md border border-dashed border-stone-300 p-3 text-center text-sm text-stone-500"
							>
								Ninguna de tus repetidas le falta a él.
							</li>
						{/each}
					</ul>
				</section>
			</div>

			<div class="mt-6 rounded-lg border border-stone-200 bg-white p-3 text-xs text-stone-600">
				<strong>Guardá este link</strong> para volver a ver el estado del intercambio. Refrescá para ver
				la propuesta recalculada con el inventario actual.
			</div>
		{/if}
	</div>
</div>
