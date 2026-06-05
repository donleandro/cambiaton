<script lang="ts">
	import { enhance } from '$app/forms';
	import favicon from '$lib/assets/favicon.svg';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Recuperar contraseña · Cambiatón</title></svelte:head>

<main class="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
	<div class="w-full max-w-sm">
		<a href="/" class="mb-6 inline-flex items-center gap-2.5">
			<img src={favicon} alt="" class="h-9 w-9" />
			<span class="text-lg font-black tracking-tight text-stone-900">Cambiatón</span>
		</a>

		{#if !data.valido}
			<h2 class="text-xl font-bold tracking-tight text-stone-900">Enlace no válido</h2>
			<p class="mt-2 text-sm text-stone-600">
				Este enlace de recuperación expiró, ya se usó, o no es correcto. Pedile al administrador
				que te genere uno nuevo.
			</p>
			<div class="mt-6 border-t border-stone-200 pt-4 text-center text-sm text-stone-600">
				<a href="/login" class="font-semibold text-stone-900 hover:underline">Volver a entrar</a>
			</div>
		{:else}
			<h2 class="text-xl font-bold tracking-tight text-stone-900">Nueva contraseña</h2>
			<p class="mt-1 text-sm text-stone-600">
				Hola{data.nombre ? `, ${data.nombre}` : ''}. Elegí una contraseña nueva
				{#if data.email}para <span class="font-medium text-stone-800">{data.email}</span>{/if}.
			</p>

			<form
				method="POST"
				class="mt-6 space-y-3"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
			>
				<input type="hidden" name="token" value={data.token} />
				<input
					type="password"
					name="password"
					autocomplete="new-password"
					required
					minlength="6"
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
					placeholder="Nueva contraseña"
				/>
				<input
					type="password"
					name="password2"
					autocomplete="new-password"
					required
					minlength="6"
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
					placeholder="Repetí la contraseña"
				/>

				{#if form?.error}
					<div class="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
						{form.error}
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
				>
					{loading ? 'Guardando…' : 'Guardar y entrar'}
				</button>
			</form>
		{/if}
	</div>
</main>
