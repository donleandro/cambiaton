<script lang="ts">
	import { enhance } from '$app/forms';
	import { track } from '$lib/client/track';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	type Vista = 'cambiatones' | 'recibidos';
	let vista = $state<Vista>('cambiatones');

	type Filtro = 'pendiente' | 'aplicado' | 'archivado' | 'todos';
	let filtro = $state<Filtro>('pendiente');

	const visibles = $derived(
		filtro === 'todos' ? data.intercambios : data.intercambios.filter((i) => i.status === filtro)
	);

	const STATUS_TONE: Record<string, string> = {
		pendiente: 'bg-amber-100 text-amber-800',
		aplicado: 'bg-emerald-100 text-emerald-800',
		archivado: 'bg-stone-100 text-stone-500'
	};

	function info(id: string) {
		return data.catalogo[id] ?? { id, equipo: '—', numero: 0, grupo: '' };
	}

	// --- Editor de ajuste (1:1, meter/sacar) -----------------------------------
	let editId = $state<number | null>(null);
	let editDoy = $state<string[]>([]);
	let editRecibo = $state<string[]>([]);
	let altDoyQ = $state('');
	let altReciboQ = $state('');

	function abrirEditor(c: { id: number; dados: string[]; recibidos: string[] }) {
		editId = c.id;
		editDoy = [...c.dados];
		editRecibo = [...c.recibidos];
		altDoyQ = '';
		altReciboQ = '';
		track('cambiaton_ajustar_abrir', { id: c.id });
	}
	function cerrarEditor() {
		editId = null;
	}
	const quitarDoy = (id: string) => (editDoy = editDoy.filter((x) => x !== id));
	const agregarDoy = (id: string) => {
		if (!editDoy.includes(id)) editDoy = [...editDoy, id];
	};
	const quitarRecibo = (id: string) => (editRecibo = editRecibo.filter((x) => x !== id));
	const agregarRecibo = (id: string) => {
		if (!editRecibo.includes(id)) editRecibo = [...editRecibo, id];
	};

	const altDoy = $derived(
		data.misRepetidas
			.filter((s) => !editDoy.includes(s.id))
			.filter((s) => {
				if (!altDoyQ) return true;
				const q = altDoyQ.toLowerCase();
				return (
					s.id.toLowerCase().includes(q) ||
					s.equipo.toLowerCase().includes(q) ||
					String(s.numero).includes(q)
				);
			})
			.slice(0, 40)
	);
	const altRecibo = $derived(
		data.misFaltantes
			.filter((s) => !editRecibo.includes(s.id))
			.filter((s) => {
				if (!altReciboQ) return true;
				const q = altReciboQ.toLowerCase();
				return (
					s.id.toLowerCase().includes(q) ||
					s.equipo.toLowerCase().includes(q) ||
					String(s.numero).includes(q)
				);
			})
			.slice(0, 40)
	);

	const editBalanceado = $derived(editDoy.length === editRecibo.length);
</script>

<svelte:head><title>Intercambios · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-3">
			<div class="flex items-center justify-between">
				<h1 class="text-lg font-bold tracking-tight">Intercambios</h1>
				<div class="flex items-center gap-3">
					<a href="/historial" class="text-sm font-medium text-stone-600 hover:text-stone-900"
						>Historial →</a
					>
					<a href="/cambiaton" class="text-sm text-emerald-700 hover:text-emerald-900"
						>+ Nuevo cambiatón</a
					>
				</div>
			</div>
			<div class="mt-3 flex gap-1 rounded-lg bg-stone-200 p-1 text-sm">
				<button
					onclick={() => (vista = 'cambiatones')}
					class="flex-1 rounded-md px-3 py-1.5 transition-colors {vista === 'cambiatones'
						? 'bg-white font-semibold text-stone-900 shadow-sm'
						: 'text-stone-600 hover:text-stone-900'}"
				>
					Mis cambiatones ({data.cambiatones.length})
				</button>
				<button
					onclick={() => (vista = 'recibidos')}
					class="flex-1 rounded-md px-3 py-1.5 transition-colors {vista === 'recibidos'
						? 'bg-white font-semibold text-stone-900 shadow-sm'
						: 'text-stone-600 hover:text-stone-900'}"
				>
					Listas recibidas ({data.stats.total})
				</button>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-4 py-5">
		{#if form?.ajustado}
			<div
				class="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
			>
				{form.anulado ? '✓ Intercambio anulado y revertido.' : '✓ Ajuste aplicado a tu colección.'}
			</div>
		{/if}
		{#if form?.error}
			<div class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
				{form.error}
			</div>
		{/if}

		{#if vista === 'cambiatones'}
			{#if data.cambiatones.length === 0}
				<div
					class="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500"
				>
					Todavía no registraste cambiatones.
					<div class="mt-2 text-xs">
						Cuando apliques uno en <a href="/cambiaton" class="underline">/cambiaton</a> queda acá, y
						lo podés ajustar si la otra persona tenía menos de lo que decía.
					</div>
				</div>
			{:else}
				<ul class="space-y-2">
					{#each data.cambiatones as c (c.id)}
						<li class="rounded-lg border border-stone-200 bg-white p-3">
							<div class="flex flex-wrap items-baseline justify-between gap-2">
								<span class="font-semibold">{c.contraparte || 'Sin nombre'}</span
								>{#if c.contraparteUserId != null}<span
										class="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
										>lista compartida</span
									>{/if}
								<span class="text-xs text-stone-500"
									>{new Date(c.fecha).toLocaleString('es-MX')}</span
								>
							</div>
							<div class="mt-1 text-xs text-stone-600">
								<strong class="text-amber-700">{c.dados.length}</strong> di ·
								<strong class="text-emerald-700">{c.recibidos.length}</strong> recibí
							</div>

							{#if editId !== c.id}
								<div class="mt-2 flex flex-wrap gap-1">
									{#each c.dados as id (id)}
										{@const s = info(id)}
										<span
											class="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] text-amber-800"
											>{s.id}</span
										>
									{/each}
									{#if c.dados.length && c.recibidos.length}<span class="px-1 text-stone-400"
											>↔</span
										>{/if}
									{#each c.recibidos as id (id)}
										{@const s = info(id)}
										<span
											class="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] text-emerald-800"
											>{s.id}</span
										>
									{/each}
								</div>
								<div class="mt-2">
									<button
										type="button"
										onclick={() => abrirEditor(c)}
										class="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
									>
										Ajustar / corregir
									</button>
								</div>
							{:else}
								<!-- EDITOR 1:1 -->
								<div class="mt-3 grid gap-3 md:grid-cols-2">
									<div>
										<div class="mb-1 text-xs font-semibold text-amber-700">
											Doy ({editDoy.length})
										</div>
										<div class="mb-2 flex flex-wrap gap-1">
											{#each editDoy as id (id)}
												{@const s = info(id)}
												<button
													type="button"
													onclick={() => quitarDoy(id)}
													class="group flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 font-mono text-[11px] text-amber-800 hover:border-rose-300 hover:bg-rose-50"
												>
													{s.id}<span class="text-stone-400 group-hover:text-rose-600">✕</span>
												</button>
											{:else}
												<span class="text-xs text-stone-400">Nada (agregá abajo)</span>
											{/each}
										</div>
										<input
											type="search"
											bind:value={altDoyQ}
											placeholder="Agregar de mis repetidas…"
											class="mb-1 w-full rounded border border-stone-300 px-2 py-1 text-xs focus:border-stone-500 focus:outline-none"
										/>
										<div class="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
											{#each altDoy as s (s.id)}
												<button
													type="button"
													onclick={() => agregarDoy(s.id)}
													class="rounded border border-stone-200 bg-white px-1.5 py-0.5 font-mono text-[11px] hover:border-amber-300 hover:bg-amber-50"
													>＋{s.id}</button
												>
											{/each}
										</div>
									</div>

									<div>
										<div class="mb-1 text-xs font-semibold text-emerald-700">
											Recibo ({editRecibo.length})
										</div>
										<div class="mb-2 flex flex-wrap gap-1">
											{#each editRecibo as id (id)}
												{@const s = info(id)}
												<button
													type="button"
													onclick={() => quitarRecibo(id)}
													class="group flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 font-mono text-[11px] text-emerald-800 hover:border-rose-300 hover:bg-rose-50"
												>
													{s.id}<span class="text-stone-400 group-hover:text-rose-600">✕</span>
												</button>
											{:else}
												<span class="text-xs text-stone-400">Nada (agregá abajo)</span>
											{/each}
										</div>
										<input
											type="search"
											bind:value={altReciboQ}
											placeholder="Agregar de mis faltantes…"
											class="mb-1 w-full rounded border border-stone-300 px-2 py-1 text-xs focus:border-stone-500 focus:outline-none"
										/>
										<div class="flex max-h-32 flex-wrap gap-1 overflow-y-auto">
											{#each altRecibo as s (s.id)}
												<button
													type="button"
													onclick={() => agregarRecibo(s.id)}
													class="rounded border border-stone-200 bg-white px-1.5 py-0.5 font-mono text-[11px] hover:border-emerald-300 hover:bg-emerald-50"
													>＋{s.id}</button
												>
											{/each}
										</div>
									</div>
								</div>

								<div
									class="mt-3 rounded-md border p-2 text-xs {editBalanceado
										? 'border-emerald-200 bg-emerald-50 text-emerald-800'
										: 'border-amber-200 bg-amber-50 text-amber-800'}"
								>
									{#if editBalanceado}
										1:1 OK — {editDoy.length} ↔ {editRecibo.length}.
									{:else}
										No está parejo ({editDoy.length} ↔ {editRecibo.length}). Tiene que ser 1 a 1
										para guardar.
									{/if}
									{#if editDoy.length === 0 && editRecibo.length === 0}
										<span class="block"
											>Vacío en ambos lados = anular el intercambio (revierte todo).</span
										>
									{/if}
								</div>

								<form
									method="POST"
									action="?/ajustar"
									use:enhance={() =>
										async ({ result, update }) => {
											await update();
											if (result.type === 'success') {
												track('cambiaton_ajustar_guardar', { id: c.id });
												cerrarEditor();
											}
										}}
									class="mt-3 flex flex-wrap gap-2"
								>
									<input type="hidden" name="id" value={c.id} />
									<input type="hidden" name="dados" value={editDoy.join(',')} />
									<input type="hidden" name="recibidos" value={editRecibo.join(',')} />
									<button
										type="submit"
										disabled={!editBalanceado}
										class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
									>
										{editDoy.length === 0 && editRecibo.length === 0
											? 'Anular intercambio'
											: 'Guardar ajuste'}
									</button>
									<button
										type="button"
										onclick={cerrarEditor}
										class="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
										>Cancelar</button
									>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		{:else}
			<div class="mb-3 flex gap-1 rounded-lg bg-stone-200 p-1 text-sm">
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

			{#if visibles.length === 0}
				<div
					class="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500"
				>
					No hay listas {filtro === 'todos' ? '' : `${filtro}s`}.
					<div class="mt-2 text-xs">
						Cuando alguien comparta su lista vía <a href="/compartir" class="underline"
							>/compartir</a
						> aparece acá.
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
										<span
											class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase {STATUS_TONE[
												it.status
											]}"
										>
											{it.status}
										</span>
										{#if it.origen === 'publico'}
											<span
												class="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
											>
												público
											</span>
										{/if}
									</div>
									<span class="text-xs text-stone-500">
										{new Date(it.fecha).toLocaleString('es-MX')}
									</span>
								</div>
								<div class="mt-1 flex flex-wrap gap-3 text-xs text-stone-600">
									<span><strong class="text-amber-700">{it.doy}</strong> yo doy</span>
									<span>·</span>
									<span><strong class="text-emerald-700">{it.recibo}</strong> recibo</span>
									<span>·</span>
									<span>balanceado <strong>{it.balanceado}</strong></span>
								</div>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		{/if}
	</div>
</div>
