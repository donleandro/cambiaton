<script lang="ts">
	import { enhance } from '$app/forms';
	import { track } from '$lib/client/track';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function preselect(items: { id: string }[], limit: number): Record<string, boolean> {
		const r: Record<string, boolean> = {};
		for (let i = 0; i < items.length; i++) r[items[i].id] = i < limit;
		return r;
	}

	let seleccionDoy = $state<Record<string, boolean>>(
		preselect(data.match.doy, data.match.balanceado)
	);
	let seleccionRecibo = $state<Record<string, boolean>>(
		preselect(data.match.recibo, data.match.balanceado)
	);

	const idsDoy = $derived(Object.keys(seleccionDoy).filter((k) => seleccionDoy[k]));
	const idsRecibo = $derived(Object.keys(seleccionRecibo).filter((k) => seleccionRecibo[k]));

	function toggleAll(target: Record<string, boolean>, ids: string[], turnOn: boolean) {
		const next = { ...target };
		for (const id of ids) next[id] = turnOn;
		return next;
	}

	const STATUS_TONE: Record<string, string> = {
		pendiente: 'bg-amber-100 text-amber-800',
		aplicado: 'bg-emerald-100 text-emerald-800',
		archivado: 'bg-stone-100 text-stone-500'
	};
</script>

<svelte:head><title>Intercambio · {data.importacion.nombre}</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
			<div>
				<div class="flex flex-wrap items-baseline gap-2">
					<h1 class="text-xl font-bold tracking-tight">
						Intercambio con {data.importacion.nombre}
					</h1>
					<span
						class="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase {STATUS_TONE[
							data.importacion.status
						]}"
					>
						{data.importacion.status}
					</span>
					{#if data.importacion.origen === 'publico'}
						<span
							class="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700"
							>público</span
						>
					{/if}
				</div>
				<p class="text-xs text-stone-500">
					{new Date(data.importacion.fecha).toLocaleString('es-MX')} · Balanceado óptimo:
					<strong>{data.match.balanceado}</strong>
				</p>
			</div>
			<div class="flex items-center gap-3 text-sm">
				<a href="/intercambios" class="text-stone-600 hover:text-stone-900">Volver a Recibidos</a>
				<form
					method="POST"
					action="?/archivar"
					use:enhance={() =>
						async ({ result, update }) => {
							await update();
							if (result.type === 'redirect')
								track('archivar_intercambio', { import_id: data.importacion.id });
						}}
				>
					<button
						type="submit"
						class="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
						title="Quitar de pendientes sin tocar tu colección"
					>
						Archivar
					</button>
				</form>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-5xl px-4 py-6">
		{#if data.importacion.submitterAnon && data.registroLink}
			<div class="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
				<p class="text-sm font-semibold text-indigo-900">
					{data.importacion.nombre} todavía no tiene cuenta registrada.
				</p>
				<p class="mt-1 text-xs text-indigo-800">
					Mandale este link (o mostrale el QR) — al abrirlo queda con sesión iniciada en su
					anonymous user actual y puede agregar email + contraseña sin perder la colección.
				</p>
				<details class="mt-3">
					<summary class="cursor-pointer text-xs font-semibold text-indigo-900 hover:underline">
						Ver link y QR
					</summary>
					<div class="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
						<div class="rounded-md bg-white p-2">{@html data.registroQrSvg}</div>
						<div class="space-y-2">
							<input
								readonly
								value={data.registroLink}
								class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs"
							/>
							<button
								type="button"
								onclick={() => {
									navigator.clipboard.writeText(data.registroLink ?? '');
									track('share_registro_link', { source: 'intercambio', method: 'copy' });
								}}
								class="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800"
							>
								Copiar link
							</button>
							<a
								href={`https://wa.me/?text=${encodeURIComponent(`Hola ${data.importacion.nombre}, abrí este link para guardar tu colección con email + contraseña: ${data.registroLink}`)}`}
								target="_blank"
								rel="noopener"
								onclick={() =>
									track('share_registro_link', { source: 'intercambio', method: 'whatsapp' })}
								class="ml-2 inline-block rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
							>
								Mandar por WhatsApp
							</a>
						</div>
					</div>
				</details>
			</div>
		{/if}

		{#if form?.ok}
			<div
				class="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
			>
				✓ Intercambio aplicado. {form.dados} dados (−1 repetida) y {form.recibidos} recibidos (marcados
				como tengo).
			</div>
		{:else if form?.error}
			<div class="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
				{form.error}
			</div>
		{/if}

		{#if data.match.doy.length === 0 && data.match.recibo.length === 0}
			<div class="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500">
				No hay match: ninguno de los stickers cruza entre lo que vos repetís y lo que él/ella
				necesita, ni viceversa.
			</div>
		{:else}
			<form
				method="POST"
				action="?/confirmar"
				use:enhance={({ formData }) => {
					formData.set('opId', crypto.randomUUID());
					return async ({ result, update }) => {
						await update();
						if (result.type === 'success') {
							track('aplicar_intercambio', {
								import_id: data.importacion.id,
								dados: idsDoy.length,
								recibidos: idsRecibo.length
							});
						}
					};
				}}
				class="space-y-6"
			>
				<input type="hidden" name="dados" value={idsDoy.join(',')} />
				<input type="hidden" name="recibidos" value={idsRecibo.join(',')} />

				<div class="grid gap-6 md:grid-cols-2">
					<section>
						<div class="mb-2 flex items-baseline justify-between">
							<h2 class="text-base font-semibold">
								Yo le doy
								<span class="text-sm font-normal text-stone-500">
									({idsDoy.length} de {data.totales.doy})
								</span>
							</h2>
							<button
								type="button"
								onclick={() => {
									const ids = data.match.doy.map((it) => it.id);
									const allOn = ids.every((id) => seleccionDoy[id]);
									seleccionDoy = toggleAll(seleccionDoy, ids, !allOn);
								}}
								class="text-xs text-stone-500 hover:text-stone-900"
							>
								{idsDoy.length === data.match.doy.length ? 'Ninguno' : 'Todos'}
							</button>
						</div>
						<ul class="space-y-1">
							{#each data.match.doy as it (it.id)}
								<li>
									<label
										class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors {seleccionDoy[
											it.id
										]
											? 'border-amber-300 bg-amber-50'
											: 'border-stone-200 bg-white hover:bg-stone-50'}"
									>
										<input
											type="checkbox"
											bind:checked={seleccionDoy[it.id]}
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
								<li
									class="rounded-md border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500"
								>
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
									({idsRecibo.length} de {data.totales.recibo})
								</span>
							</h2>
							<button
								type="button"
								onclick={() => {
									const ids = data.match.recibo.map((it) => it.id);
									const allOn = ids.every((id) => seleccionRecibo[id]);
									seleccionRecibo = toggleAll(seleccionRecibo, ids, !allOn);
								}}
								class="text-xs text-stone-500 hover:text-stone-900"
							>
								{idsRecibo.length === data.match.recibo.length ? 'Ninguno' : 'Todos'}
							</button>
						</div>
						<ul class="space-y-1">
							{#each data.match.recibo as it (it.id)}
								<li>
									<label
										class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors {seleccionRecibo[
											it.id
										]
											? 'border-emerald-300 bg-emerald-50'
											: 'border-stone-200 bg-white hover:bg-stone-50'}"
									>
										<input
											type="checkbox"
											bind:checked={seleccionRecibo[it.id]}
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
											<span
												class="rounded bg-emerald-100 px-1.5 text-xs font-semibold text-emerald-800"
												>×{it.cantidad}</span
											>
										{/if}
									</label>
								</li>
							{:else}
								<li
									class="rounded-md border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500"
								>
									Ninguna de sus repetidas te falta.
								</li>
							{/each}
						</ul>
					</section>
				</div>

				<div
					class="sticky bottom-0 -mx-4 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur"
				>
					<div class="flex flex-wrap items-center justify-between gap-2">
						<div class="text-sm text-stone-600">
							{#if idsDoy.length === 0 && idsRecibo.length === 0}
								<span class="text-stone-500">Elegí al menos uno de cada lado.</span>
							{:else if idsDoy.length !== idsRecibo.length}
								<span class="text-amber-700">
									No está parejo: {idsDoy.length} doy vs {idsRecibo.length} recibo. El cambio es siempre
									1 a 1.
								</span>
							{:else}
								<span class="text-emerald-700">
									1 a 1: {idsDoy.length} ↔ {idsRecibo.length}
								</span>
							{/if}
						</div>
						<button
							type="submit"
							disabled={idsDoy.length !== idsRecibo.length || idsDoy.length === 0}
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
