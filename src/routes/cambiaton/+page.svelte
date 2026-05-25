<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Step = 1 | 2 | 3;
	let step = $state<Step>(1);

	let recibo = $state<Record<string, boolean>>({});
	let doy = $state<Record<string, boolean>>({});

	let searchFalt = $state('');
	let grupoFalt = $state('');
	let searchRep = $state('');
	let grupoRep = $state('');

	const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

	const filtFaltantes = $derived(
		data.misFaltantes.filter((s) => {
			if (grupoFalt && s.grupo !== grupoFalt) return false;
			if (searchFalt) {
				const q = searchFalt.toLowerCase();
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

	const filtRepetidas = $derived(
		data.misRepetidas.filter((s) => {
			if (grupoRep && s.grupo !== grupoRep) return false;
			if (searchRep) {
				const q = searchRep.toLowerCase();
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

	const idsRecibo = $derived(Object.keys(recibo).filter((k) => recibo[k]));
	const idsDoy = $derived(Object.keys(doy).filter((k) => doy[k]));

	const stickersRecibo = $derived(data.misFaltantes.filter((s) => recibo[s.id]));
	const stickersDoy = $derived(data.misRepetidas.filter((s) => doy[s.id]));

	function nextStep() {
		if (step < 3) step = (step + 1) as Step;
	}
	function prevStep() {
		if (step > 1) step = (step - 1) as Step;
	}
</script>

<svelte:head><title>Cambiatón en vivo · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-3">
			<div class="flex items-center justify-between">
				<h1 class="text-lg font-bold tracking-tight">Cambiatón en vivo</h1>
				<a href="/" class="text-sm text-stone-600 hover:text-stone-900">← Salir</a>
			</div>
			<div class="mt-3 flex items-center gap-2">
				{#each [1, 2, 3] as n (n)}
					<div class="flex flex-1 items-center gap-2">
						<button
							type="button"
							onclick={() => (step = n as Step)}
							class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors {step ===
							n
								? 'bg-stone-900 text-white'
								: step > n
									? 'bg-emerald-500 text-white'
									: 'bg-stone-200 text-stone-500'}"
						>
							{step > n ? '✓' : n}
						</button>
						<div class="min-w-0 flex-1">
							<div class="truncate text-xs font-medium {step === n ? 'text-stone-900' : 'text-stone-500'}">
								{n === 1 ? 'Lo que él tiene' : n === 2 ? 'Lo que él necesita' : 'Confirmar'}
							</div>
						</div>
						{#if n < 3}
							<div class="h-px flex-1 bg-stone-200"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-4 py-5">
		{#if form?.ok}
			<div class="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
				✓ Intercambio aplicado: {form.dados} dados, {form.recibidos} recibidos.
				<button class="ml-2 underline" onclick={() => goto('/')}>Ver catálogo</button>
			</div>
		{/if}

		{#if step === 1}
			<section>
				<h2 class="mb-1 text-lg font-semibold">Paso 1 · ¿Qué de mis faltantes tiene él/ella?</h2>
				<p class="mb-4 text-sm text-stone-600">
					Revisá tus faltantes y marcá las que la otra persona tenga repetidas.
					Seleccionados: <strong>{idsRecibo.length}</strong>.
				</p>

				<div class="mb-3 flex flex-wrap gap-2">
					<input
						type="search"
						placeholder="Buscar…"
						bind:value={searchFalt}
						class="min-w-[180px] flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
					/>
					<select
						bind:value={grupoFalt}
						class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
					>
						<option value="">Todos los grupos</option>
						{#each GRUPOS as g (g)}
							<option value={g}>Grupo {g}</option>
						{/each}
					</select>
				</div>

				<div class="mb-3 text-xs text-stone-500">Mostrando {filtFaltantes.length} de {data.misFaltantes.length} faltantes</div>

				<ul class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
					{#each filtFaltantes as s (s.id)}
						<li>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors {recibo[
									s.id
								]
									? 'border-emerald-300 bg-emerald-50'
									: 'border-stone-200 bg-white hover:bg-stone-50'}"
							>
								<input
									type="checkbox"
									bind:checked={recibo[s.id]}
									class="h-4 w-4 shrink-0 accent-emerald-600"
								/>
								{#if s.grupo}
									<span class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white">{s.grupo}</span>
								{/if}
								<span class="min-w-0 flex-1">
									<span class="block font-mono text-xs font-bold">{s.id}</span>
									<span class="block truncate text-xs text-stone-600">{s.equipo}</span>
								</span>
							</label>
						</li>
					{:else}
						<li class="col-span-full rounded-md border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
							Sin faltantes con esos filtros.
						</li>
					{/each}
				</ul>
			</section>
		{:else if step === 2}
			<section>
				<h2 class="mb-1 text-lg font-semibold">Paso 2 · ¿Qué de mis repetidas le falta a él/ella?</h2>
				<p class="mb-4 text-sm text-stone-600">
					Revisá tus repetidas y marcá las que la otra persona necesite.
					Seleccionados: <strong>{idsDoy.length}</strong>.
				</p>

				<div class="mb-3 flex flex-wrap gap-2">
					<input
						type="search"
						placeholder="Buscar…"
						bind:value={searchRep}
						class="min-w-[180px] flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
					/>
					<select
						bind:value={grupoRep}
						class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
					>
						<option value="">Todos los grupos</option>
						{#each GRUPOS as g (g)}
							<option value={g}>Grupo {g}</option>
						{/each}
					</select>
				</div>

				<div class="mb-3 text-xs text-stone-500">Mostrando {filtRepetidas.length} de {data.misRepetidas.length} repetidas</div>

				<ul class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
					{#each filtRepetidas as s (s.id)}
						<li>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors {doy[
									s.id
								]
									? 'border-amber-300 bg-amber-50'
									: 'border-stone-200 bg-white hover:bg-stone-50'}"
							>
								<input
									type="checkbox"
									bind:checked={doy[s.id]}
									class="h-4 w-4 shrink-0 accent-amber-600"
								/>
								{#if s.grupo}
									<span class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white">{s.grupo}</span>
								{/if}
								<span class="min-w-0 flex-1">
									<span class="block font-mono text-xs font-bold">{s.id}</span>
									<span class="block truncate text-xs text-stone-600">{s.equipo}</span>
								</span>
								{#if s.repetidas > 1}
									<span class="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">×{s.repetidas}</span>
								{/if}
							</label>
						</li>
					{:else}
						<li class="col-span-full rounded-md border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">
							Sin repetidas con esos filtros.
						</li>
					{/each}
				</ul>
			</section>
		{:else}
			<section>
				<h2 class="mb-1 text-lg font-semibold">Paso 3 · Confirmar intercambio</h2>
				<p class="mb-4 text-sm text-stone-600">
					Revisá el resumen. Si está balanceado, dale al botón verde y se aplica a tu catálogo.
				</p>

				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<h3 class="mb-2 flex items-center justify-between border-b border-stone-200 pb-1">
							<span class="font-semibold">Yo recibo <span class="text-stone-500">({stickersRecibo.length})</span></span>
							<button type="button" onclick={() => (step = 1)} class="text-xs text-stone-500 hover:text-stone-900">Editar paso 1</button>
						</h3>
						<ul class="space-y-1">
							{#each stickersRecibo as s (s.id)}
								<li class="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm">
									{#if s.grupo}<span class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white">{s.grupo}</span>{/if}
									<span class="font-mono text-sm font-bold">{s.id}</span>
									<span class="flex-1 truncate text-stone-700">{s.equipo}</span>
									<span class="text-xs text-stone-500">#{s.numero}</span>
								</li>
							{:else}
								<li class="rounded-md border border-dashed border-stone-300 p-3 text-center text-sm text-stone-500">Nada en este lado.</li>
							{/each}
						</ul>
					</div>

					<div>
						<h3 class="mb-2 flex items-center justify-between border-b border-stone-200 pb-1">
							<span class="font-semibold">Yo doy <span class="text-stone-500">({stickersDoy.length})</span></span>
							<button type="button" onclick={() => (step = 2)} class="text-xs text-stone-500 hover:text-stone-900">Editar paso 2</button>
						</h3>
						<ul class="space-y-1">
							{#each stickersDoy as s (s.id)}
								<li class="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm">
									{#if s.grupo}<span class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white">{s.grupo}</span>{/if}
									<span class="font-mono text-sm font-bold">{s.id}</span>
									<span class="flex-1 truncate text-stone-700">{s.equipo}</span>
									<span class="text-xs text-stone-500">#{s.numero}</span>
								</li>
							{:else}
								<li class="rounded-md border border-dashed border-stone-300 p-3 text-center text-sm text-stone-500">Nada en este lado.</li>
							{/each}
						</ul>
					</div>
				</div>

				<div class="mt-5 rounded-md border bg-white p-3 text-sm {stickersDoy.length === stickersRecibo.length
					? 'border-emerald-200'
					: 'border-amber-200'}">
					{#if stickersDoy.length === stickersRecibo.length}
						<span class="font-semibold text-emerald-700">Balanceado:</span> {stickersDoy.length} ↔ {stickersRecibo.length}
					{:else}
						<span class="font-semibold text-amber-700">Desbalanceado:</span> {stickersDoy.length} doy vs {stickersRecibo.length} recibo. Podés seguir igual si están de acuerdo.
					{/if}
				</div>

				<form method="POST" action="?/confirmar" use:enhance class="mt-4">
					<input type="hidden" name="dados" value={idsDoy.join(',')} />
					<input type="hidden" name="recibidos" value={idsRecibo.join(',')} />
					<button
						type="submit"
						disabled={idsDoy.length === 0 && idsRecibo.length === 0}
						class="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
					>
						Aplicar intercambio
					</button>
				</form>

				{#if form?.error}
					<div class="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
						{form.error}
					</div>
				{/if}
			</section>
		{/if}
	</div>

	<nav class="sticky bottom-0 border-t border-stone-200 bg-white/95 backdrop-blur">
		<div class="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-3">
			<button
				type="button"
				onclick={prevStep}
				disabled={step === 1}
				class="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-30"
			>
				← Anterior
			</button>
			<div class="text-xs text-stone-500">
				Paso {step} de 3
			</div>
			<button
				type="button"
				onclick={nextStep}
				disabled={step === 3}
				class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-30"
			>
				Siguiente →
			</button>
		</div>
	</nav>
</div>
