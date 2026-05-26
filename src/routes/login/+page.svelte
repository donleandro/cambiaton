<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Entrar · Álbum 2026</title></svelte:head>

<div class="grid min-h-screen place-items-center bg-stone-50 p-4">
	<div class="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
		<h1 class="text-xl font-bold tracking-tight">Álbum Mundial 2026</h1>
		<p class="mt-1 text-sm text-stone-600">Entrá con tu contraseña.</p>

		<form
			method="POST"
			class="mt-5 space-y-3"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
		>
			<input
				type="password"
				name="password"
				autocomplete="current-password"
				autofocus
				required
				class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
				placeholder="Contraseña"
			/>

			{#if form?.error}
				<div class="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
					{form.error}
				</div>
			{/if}

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
			>
				{loading ? 'Entrando…' : 'Entrar'}
			</button>
		</form>
	</div>
</div>
