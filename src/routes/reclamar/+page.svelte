<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { track } from '$lib/client/track';
	import { page } from '$app/state';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);

	onMount(() => {
		// Trackear si llegamos a reclamar vía link/QR de auto-claim (cuando el
		// receiver le pasó al submitter un /reclamar?token=...). El token de
		// servidor ya se consumió y rebotó a /reclamar limpio, pero ese rebote
		// es el indicador de que vino por la ruta de auto-claim.
		const ref = document.referrer;
		if (ref && ref.includes('token=')) {
			track('arrival_via_qr', { kind: 'reclamar' });
		}
	});
</script>

<svelte:head><title>Reclamar cuenta · Álbum 2026</title></svelte:head>

<div class="grid min-h-screen place-items-center bg-stone-50 p-4">
	<div class="w-full max-w-sm rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
		<h1 class="text-xl font-bold tracking-tight">Reclamá tu cuenta</h1>
		<p class="mt-1 text-sm text-stone-600">
			Tu colección ya está guardada como <strong>{data.user.nombre}</strong>. Agregá email y contraseña
			para volver a entrar después sin necesitar el link.
		</p>

		<form
			method="POST"
			class="mt-5 space-y-3"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					await update();
					loading = false;
					if (result.type === 'redirect') track('claim_account');
				};
			}}
		>
			<input
				type="text"
				name="nombre"
				placeholder="Tu nombre"
				value={data.user.nombre}
				class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
			/>
			<input
				type="email"
				name="email"
				autocomplete="email"
				required
				placeholder="Email"
				value={form?.email ?? ''}
				class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
			/>
			<input
				type="password"
				name="password"
				autocomplete="new-password"
				required
				minlength="6"
				placeholder="Contraseña (mín 6 chars)"
				class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
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
				{loading ? 'Guardando…' : 'Guardar y entrar'}
			</button>
		</form>

		<div class="mt-6 border-t border-stone-100 pt-4 text-center text-sm">
			<a href="/" class="text-stone-600 hover:underline">Por ahora no, seguir como invitado</a>
		</div>
	</div>
</div>
