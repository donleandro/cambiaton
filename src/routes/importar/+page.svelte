<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Importar inventario · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
		<div class="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
			<h1 class="text-xl font-bold tracking-tight">Importar inventario ajeno</h1>
			<a href="/" class="text-sm text-stone-600 hover:text-stone-900">← Volver al catálogo</a>
		</div>
	</header>

	<div class="mx-auto max-w-3xl px-4 py-6">
		<p class="mb-6 text-sm text-stone-600">
			Pegá lo que la otra persona <strong>te pasó</strong>: sus faltantes (qué le falta) y sus
			repetidas (qué tiene de sobra). Calculamos el intercambio óptimo.
		</p>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="space-y-5"
		>
			<div>
				<label for="nombre" class="mb-1 block text-sm font-medium">Nombre o referencia</label>
				<input
					id="nombre"
					name="nombre"
					placeholder="Juan (vecino) · 25-may"
					value={form?.nombre ?? ''}
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
				/>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label for="faltantes" class="mb-1 block text-sm font-medium">
						Sus faltantes
						<span class="font-normal text-stone-500">(que YO podría darle)</span>
					</label>
					<textarea
						id="faltantes"
						name="faltantes"
						rows="14"
						placeholder={`Pegá una lista, ej:\nGER-05\nARG-10\n253\nBRA-07 x2`}
						value={form?.faltantesTexto ?? ''}
						class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs focus:border-stone-500 focus:outline-none"
					></textarea>
				</div>

				<div>
					<label for="repetidas" class="mb-1 block text-sm font-medium">
						Sus repetidas
						<span class="font-normal text-stone-500">(que ÉL podría darme)</span>
					</label>
					<textarea
						id="repetidas"
						name="repetidas"
						rows="14"
						placeholder={`Pegá una lista, ej:\nMEX-15\nESP-08 x3\n482`}
						value={form?.repetidasTexto ?? ''}
						class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs focus:border-stone-500 focus:outline-none"
					></textarea>
				</div>
			</div>

			<div class="rounded-md bg-stone-100 p-3 text-xs text-stone-600">
				<strong>Formato aceptado:</strong> un ID por línea (<code class="font-mono">GER-01</code>), o
				número del álbum suelto (<code class="font-mono">253</code>). Para cantidades:
				<code class="font-mono">GER-01 x2</code> o <code class="font-mono">GER-01 (2)</code>. Tolerante
				a viñetas (<code>•</code>, <code>-</code>) y separadores por coma.
			</div>

			{#if form?.error}
				<div class="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
					{form.error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
			>
				{loading ? 'Calculando…' : 'Calcular intercambio'}
			</button>
		</form>
	</div>
</div>
