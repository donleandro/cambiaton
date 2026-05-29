<script lang="ts">
	import { enhance } from '$app/forms';
	import { track } from '$lib/client/track';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Entrar · Álbum 2026</title></svelte:head>

<div class="grid min-h-screen place-items-center bg-stone-50 p-4">
	<div class="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
		<h1 class="text-xl font-bold tracking-tight">Álbum Mundial 2026</h1>
		<p class="mt-1 text-sm text-stone-600">Entrá con tu email y contraseña.</p>

		<form
			method="POST"
			class="mt-5 space-y-3"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					await update();
					loading = false;
					if (result.type === 'redirect') track('login', { method: 'password' });
				};
			}}
		>
			<input
				type="email"
				name="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
				class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
				placeholder="Email"
			/>
			<input
				type="password"
				name="password"
				autocomplete="current-password"
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

		<div class="mt-6 border-t border-stone-100 pt-4 text-center text-sm">
			<a href="/registro" class="font-semibold text-stone-900 hover:underline">Crear cuenta</a>
			<span class="mx-2 text-stone-400">·</span>
			<a href="/compartir" class="text-stone-600 hover:underline">Compartir mi lista sin cuenta</a>
		</div>
	</div>
</div>
