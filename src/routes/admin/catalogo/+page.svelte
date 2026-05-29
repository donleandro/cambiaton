<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Mantenemos texto editable por fila (no perdemos lo que el user escribió
	// si recarga la lista por una respuesta).
	let drafts = $state<Record<string, string>>(
		Object.fromEntries(data.pendientes.map((s) => [s.id, s.descripcion ?? '']))
	);
	let guardando = $state<string | null>(null);
</script>

<svelte:head><title>Admin · Catálogo · Cambiatón</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<div>
				<h1 class="text-lg font-bold tracking-tight">Admin · Catálogo</h1>
				<p class="text-xs text-stone-500">
					{data.totalPendientes} pendientes de {data.totalCatalogo} stickers
				</p>
			</div>
			<a href="/" class="text-sm text-stone-600 hover:text-stone-900">← Catálogo</a>
		</div>
	</header>

	<div class="mx-auto max-w-3xl px-4 py-6">
		<div class="mb-4 rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
			<p>
				Stickers sin descripción real (o con placeholder). Editá el campo y dale Enter o tab para
				guardar.
			</p>
		</div>

		{#if data.pendientes.length === 0}
			<div class="rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-8 text-center">
				<p class="font-semibold text-emerald-800">No hay pendientes 🎉</p>
				<p class="mt-1 text-sm text-emerald-700">
					Todos los stickers del catálogo tienen una descripción real.
				</p>
			</div>
		{:else}
			<div class="overflow-hidden rounded-xl border border-stone-200 bg-white">
				<table class="w-full text-sm">
					<thead class="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
						<tr>
							<th class="px-3 py-2 text-left">ID</th>
							<th class="px-3 py-2 text-left">Equipo</th>
							<th class="px-3 py-2 text-right">#</th>
							<th class="px-3 py-2 text-left">Tipo</th>
							<th class="w-full px-3 py-2 text-left">Descripción</th>
						</tr>
					</thead>
					<tbody>
						{#each data.pendientes as s (s.id)}
							<tr class="border-b border-stone-100 last:border-b-0">
								<td class="px-3 py-2 font-mono text-xs font-bold">{s.id}</td>
								<td class="px-3 py-2 text-xs">{s.equipo}</td>
								<td class="px-3 py-2 text-right font-mono text-xs text-stone-500">{s.numero}</td>
								<td class="px-3 py-2 text-xs text-stone-500">{s.tipo}</td>
								<td class="px-2 py-1">
									<form
										method="POST"
										action="?/updateDescripcion"
										use:enhance={() => {
											guardando = s.id;
											return async ({ result, update }) => {
												await update({ reset: false });
												guardando = null;
												if (result.type === 'success') {
													drafts[s.id] = (result.data?.descripcion as string) ?? drafts[s.id];
												}
											};
										}}
									>
										<input type="hidden" name="id" value={s.id} />
										<div class="flex gap-2">
											<input
												type="text"
												name="descripcion"
												bind:value={drafts[s.id]}
												placeholder="Descripción real"
												class="min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
											/>
											<button
												type="submit"
												disabled={guardando === s.id}
												class="shrink-0 rounded-md bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
											>
												{guardando === s.id ? '…' : 'Guardar'}
											</button>
										</div>
									</form>
									{#if form?.ok && form.id === s.id}
										<div class="mt-1 text-[11px] text-emerald-600">✓ Guardado</div>
									{:else if form?.error && form.id === s.id}
										<div class="mt-1 text-[11px] text-rose-600">{form.error}</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>
