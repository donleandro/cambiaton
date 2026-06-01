<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Metadatos visuales por "forma" del movimiento.
	const estilo: Record<string, { label: string; icon: string; clase: string }> = {
		cambiaton: {
			label: 'Cambiatón',
			icon: 'M4 8h13l-3-3m3 3l-3 3 M20 16H7l3-3m-3 3l3 3',
			clase: 'bg-amber-100 text-amber-700'
		},
		lista: {
			label: 'Lista',
			icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
			clase: 'bg-sky-100 text-sky-700'
		},
		manual: {
			label: 'Manual',
			icon: 'M5 13l4 4L19 7',
			clase: 'bg-stone-200 text-stone-700'
		},
		ajuste: {
			label: 'Ajuste',
			icon: 'M12 4v16m8-8H4',
			clase: 'bg-violet-100 text-violet-700'
		}
	};

	const hoy = new Date().toISOString().slice(0, 10);
	function tituloDia(dia: string): string {
		if (dia === hoy) return 'Hoy';
		const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
		if (dia === ayer) return 'Ayer';
		return new Date(dia + 'T12:00:00').toLocaleDateString('es', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}
	function hora(ts: string): string {
		return new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head><title>Historial · Cambiatón</title></svelte:head>

<div class="mx-auto max-w-2xl px-4 py-6">
	<div class="mb-5 flex items-baseline justify-between">
		<div>
			<h1 class="text-xl font-black tracking-tight text-stone-900">Historial</h1>
			<p class="text-sm text-stone-500">
				Todo lo que hiciste, por fecha — cambiatones, listas y cambios manuales.
			</p>
		</div>
		<span class="shrink-0 text-xs font-semibold text-stone-400">{data.total} mov.</span>
	</div>

	{#if data.dias.length === 0}
		<div class="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500">
			Todavía no hay movimientos registrados.<br />
			<span class="text-xs">Apenas hagas un cambio o marques un sticker, aparece acá.</span>
		</div>
	{:else}
		<div class="space-y-6">
			{#each data.dias as grupo (grupo.dia)}
				<section>
					<h2
						class="sticky top-0 z-10 mb-2 bg-stone-50/95 py-1 text-xs font-bold uppercase tracking-wide text-stone-500 backdrop-blur"
					>
						{tituloDia(grupo.dia)}
					</h2>
					<ul class="space-y-2">
						{#each grupo.eventos as ev (ev.ts + ev.titulo)}
							{@const st = estilo[ev.forma]}
							<li
								class="flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
							>
								<span
									class="grid h-9 w-9 shrink-0 place-items-center rounded-lg {st.clase}"
									title={st.label}
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="h-5 w-5"
									>
										<path d={st.icon} />
									</svg>
								</span>

								<div class="min-w-0 flex-1">
									<div class="flex items-baseline justify-between gap-2">
										<p class="truncate font-semibold text-stone-900">{ev.titulo}</p>
										<span class="shrink-0 text-xs tabular-nums text-stone-400">{hora(ev.ts)}</span>
									</div>
									{#if ev.detalle}
										<p class="mt-0.5 text-sm text-stone-600">{ev.detalle}</p>
									{/if}
									<div class="mt-1 flex items-center gap-2">
										<span
											class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide {st.clase}"
											>{st.label}</span
										>
										{#if ev.dispositivo}
											<span class="text-[11px] text-stone-400">📱 {ev.dispositivo}</span>
										{/if}
										{#if ev.link}
											<a
												href={ev.link}
												class="ml-auto shrink-0 rounded-md border border-stone-300 px-2 py-0.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
											>
												{ev.linkLabel ?? 'Ver'} →
											</a>
										{/if}
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
	{/if}
</div>
