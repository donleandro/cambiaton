<script lang="ts">
	import { enhance } from '$app/forms';
	import { track } from '$lib/client/track';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	let faltantesText = $state(form?.faltantesTexto ?? '');
	let repetidasText = $state(form?.repetidasTexto ?? '');
	let reemplazar = $state(!data.tieneData);
	let pegando = $state<'faltantes' | 'repetidas' | null>(null);

	async function pegarDelPortapapeles(destino: 'faltantes' | 'repetidas') {
		pegando = destino;
		try {
			const texto = await navigator.clipboard.readText();
			if (destino === 'faltantes') faltantesText = texto;
			else repetidasText = texto;
		} catch {
			alert('No se pudo leer el portapapeles. Pegá manualmente con tap largo → Pegar.');
		} finally {
			pegando = null;
		}
	}
</script>

<svelte:head><title>Importar mi lista · Cambiatón</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<h1 class="text-lg font-bold tracking-tight">Importar mi lista</h1>
			<a href="/" class="text-sm text-stone-600 hover:text-stone-900">
				{data.tieneData ? '← Catálogo' : 'Empezar vacío →'}
			</a>
		</div>
	</header>

	<div class="mx-auto max-w-3xl px-4 py-6">
		<!-- Explainer -->
		<div class="mb-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
			<div class="bg-stone-950 px-5 py-4 text-stone-100">
				<div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-400">
					{data.tieneData ? 'Actualizar colección' : 'Onboarding'}
				</div>
				<h2 class="mt-1 text-2xl font-black">
					{#if data.tieneData}
						Pisá tu colección desde Figuritas
					{:else}
						Empezá fuerte: pegá tu lista de Figuritas
					{/if}
				</h2>
				<p class="mt-1 text-sm text-stone-300">
					En la app Figuritas: <span class="text-amber-300">Compartir → Faltantes</span> y
					<span class="text-amber-300">Compartir → Repetidas</span>. Pegá las dos listas acá y te
					calculamos tu álbum completo.
				</p>
			</div>

			{#if data.tieneData}
				<div class="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-900">
					⚠ Ya tenés <strong>{data.tengo} stickers marcados</strong> y <strong>{data.repetidas} repetidas</strong>.
					Si dejás la opción "reemplazar todo" abajo, esto sobrescribe tu colección actual.
				</div>
			{/if}
		</div>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					await update();
					loading = false;
					if (result.type === 'redirect') track('importar_figuritas', { reemplazar });
				};
			}}
			class="space-y-4"
		>
			<!-- FALTANTES -->
			<div class="overflow-hidden rounded-xl border border-rose-200 bg-white">
				<div class="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-3 py-2">
					<label for="faltantes" class="text-sm font-semibold text-rose-700">
						Tus faltantes
						<span class="text-xs font-normal text-rose-600/70">(lo que te falta)</span>
					</label>
					<button
						type="button"
						onclick={() => pegarDelPortapapeles('faltantes')}
						disabled={pegando !== null}
						class="rounded-md border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
					>
						{pegando === 'faltantes' ? '…' : '📋 Pegar'}
					</button>
				</div>
				<textarea
					id="faltantes"
					name="faltantes"
					rows="10"
					bind:value={faltantesText}
					placeholder={`Pegá lo que copiaste de Figuritas → Compartir faltantes. Ej:\n\nFiguritas App - Lista\nMe faltan\nFWC 🏆: 2, 3, 4\nMEX 🇲🇽: 4, 5, 6, 7\nARG 🇦🇷: 13, 14`}
					class="w-full resize-y border-0 bg-white px-3 py-3 font-mono text-xs focus:outline-none"
				></textarea>
			</div>

			<!-- REPETIDAS -->
			<div class="overflow-hidden rounded-xl border border-amber-200 bg-white">
				<div class="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-3 py-2">
					<label for="repetidas" class="text-sm font-semibold text-amber-700">
						Tus repetidas
						<span class="text-xs font-normal text-amber-600/70">(lo que te sobra)</span>
					</label>
					<button
						type="button"
						onclick={() => pegarDelPortapapeles('repetidas')}
						disabled={pegando !== null}
						class="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
					>
						{pegando === 'repetidas' ? '…' : '📋 Pegar'}
					</button>
				</div>
				<textarea
					id="repetidas"
					name="repetidas"
					rows="10"
					bind:value={repetidasText}
					placeholder={`Pegá lo que copiaste de Figuritas → Compartir repetidas. Ej:\n\nFiguritas App - Lista\nRepetidas\nESP 🇪🇸: 8, 12\nBRA-15 x2`}
					class="w-full resize-y border-0 bg-white px-3 py-3 font-mono text-xs focus:outline-none"
				></textarea>
			</div>

			<!-- REEMPLAZAR -->
			<label
				class="flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 transition-colors {reemplazar
					? 'border-amber-400 bg-amber-50/40'
					: 'border-stone-200'}"
			>
				<input
					type="checkbox"
					name="reemplazar"
					value="1"
					bind:checked={reemplazar}
					class="mt-0.5 h-4 w-4 accent-amber-500"
				/>
				<div class="flex-1 text-sm">
					<div class="font-semibold text-stone-900">Reemplazar todo</div>
					<div class="mt-0.5 text-xs text-stone-600">
						Sticker que no aparece en ninguna lista → asumimos que <strong>lo tenés</strong>. Esto
						es lo que la app Figuritas espera: vos compartís lo que falta y lo que sobra, lo demás
						es implícito.
					</div>
					{#if !reemplazar && data.tieneData}
						<div class="mt-1 text-xs text-stone-500">
							Sin esta opción, sólo actualizamos las filas que aparecen en tus listas y dejamos el
							resto como estaba.
						</div>
					{/if}
				</div>
			</label>

			<div class="rounded-md bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">
				<strong>Formato:</strong> aceptamos el formato Figuritas tal cual lo copias
				(<code class="font-mono">MEX 🇲🇽: 4, 5, 6</code>) o IDs sueltos
				(<code class="font-mono">GER-04</code>). Las cabeceras y emojis se ignoran solos.
			</div>

			{#if form?.error}
				<div class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
					{form.error}
				</div>
			{/if}

			<div class="flex flex-col gap-2 sm:flex-row">
				<button
					type="submit"
					disabled={loading}
					class="flex-1 rounded-lg bg-stone-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
				>
					{loading ? 'Importando…' : 'Importar y calcular mi álbum'}
				</button>
				{#if !data.tieneData}
					<a
						href="/"
						class="grid place-items-center rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
					>
						Empezar vacío
					</a>
				{/if}
			</div>
		</form>
	</div>
</div>
