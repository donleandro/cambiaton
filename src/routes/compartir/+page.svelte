<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let loading = $state(false);
	let faltantesText = $state(form?.faltantesTexto ?? '');
	let repetidasText = $state(form?.repetidasTexto ?? '');
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

<svelte:head><title>Compartir tu lista · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
		<div class="mx-auto max-w-2xl px-4 py-3">
			<div class="flex items-start justify-between gap-2">
				<div>
					<h1 class="text-lg font-bold tracking-tight">Compartir tu inventario</h1>
					<p class="text-xs text-stone-500">
						Pegá tu lista y te calculamos el intercambio. El dueño del álbum lo revisa y aplica.
					</p>
				</div>
				{#if data.user}
					<a
						href="/"
						class="shrink-0 text-xs text-stone-500 hover:text-stone-900"
						title="Volver a tu catálogo"
					>← Catálogo</a>
				{/if}
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-2xl px-4 py-5">
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="space-y-4"
		>
			<div>
				<label for="nombre" class="mb-1 block text-sm font-medium">Tu nombre o referencia</label>
				<input
					id="nombre"
					name="nombre"
					required
					placeholder="Juan · cambiatón parque"
					value={form?.nombre ?? ''}
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
				/>
			</div>

			<div>
				<div class="mb-1 flex items-baseline justify-between">
					<label for="faltantes" class="block text-sm font-medium">
						Tus <span class="text-emerald-700">faltantes</span>
						<span class="text-xs font-normal text-stone-500">(lo que necesitás)</span>
					</label>
					<button
						type="button"
						onclick={() => pegarDelPortapapeles('faltantes')}
						disabled={pegando !== null}
						class="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
					>
						{pegando === 'faltantes' ? '…' : '📋 Pegar del portapapeles'}
					</button>
				</div>
				<textarea
					id="faltantes"
					name="faltantes"
					rows="10"
					bind:value={faltantesText}
					placeholder={`Pegá lo que te pasó tu otra app. Ej:\nMEX 🇲🇽: 4, 5, 6\nFWC 🏆: 2, 3\nGER-04`}
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs focus:border-stone-500 focus:outline-none"
				></textarea>
			</div>

			<div>
				<div class="mb-1 flex items-baseline justify-between">
					<label for="repetidas" class="block text-sm font-medium">
						Tus <span class="text-amber-700">repetidas</span>
						<span class="text-xs font-normal text-stone-500">(lo que te sobra)</span>
					</label>
					<button
						type="button"
						onclick={() => pegarDelPortapapeles('repetidas')}
						disabled={pegando !== null}
						class="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
					>
						{pegando === 'repetidas' ? '…' : '📋 Pegar del portapapeles'}
					</button>
				</div>
				<textarea
					id="repetidas"
					name="repetidas"
					rows="10"
					bind:value={repetidasText}
					placeholder={`Pegá tu lista de repetidas. Ej:\nESP 🇪🇸: 8, 12\nBRA-15 x2`}
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs focus:border-stone-500 focus:outline-none"
				></textarea>
			</div>

			<div class="rounded-md bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">
				<strong>Formato:</strong> aceptamos el formato Figuritas tal cual te lo pasen
				(<code class="font-mono">MEX 🇲🇽: 4, 5, 6</code>) o IDs sueltos (<code class="font-mono">GER-04</code>).
				Los encabezados, emojis y URLs se ignoran solos.
			</div>

			{#if form?.error}
				<div class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
					{form.error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-bold text-white hover:bg-stone-800 disabled:opacity-50"
			>
				{loading ? 'Calculando…' : 'Calcular intercambio'}
			</button>
		</form>
	</div>
</div>
