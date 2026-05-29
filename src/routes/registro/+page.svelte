<script lang="ts">
	import { enhance } from '$app/forms';
	import { track } from '$lib/client/track';
	import favicon from '$lib/assets/favicon.svg';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Crear cuenta · Cambiatón</title></svelte:head>

<div class="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
	<aside class="relative overflow-hidden bg-stone-950 px-6 py-10 text-stone-100 lg:px-12 lg:py-14">
		<div
			class="absolute inset-0 opacity-30"
			style="background-image: radial-gradient(#27272a 1px, transparent 1px); background-size: 24px 24px;"
		></div>
		<div class="relative flex h-full flex-col">
			<a href="/" class="inline-flex items-center gap-2.5">
				<img src={favicon} alt="" class="h-9 w-9" />
				<span class="text-lg font-black tracking-tight">Cambiatón</span>
			</a>

			<div class="mt-10 lg:mt-16">
				<h1 class="text-4xl font-black leading-[1.05] tracking-tight lg:text-5xl">
					Empezá tu<br />
					<span class="text-amber-400">álbum digital</span><br />
					en 30 segundos.
				</h1>
				<p class="mt-5 max-w-md text-base text-stone-400 lg:text-lg">
					Te creamos la cuenta vacía y vos vas marcando lo que tenés. Después generás tu QR para
					que tus amigos te compartan su lista y empieces a cambiar.
				</p>
			</div>

			<ul class="mt-8 space-y-3 text-sm text-stone-300 lg:mt-10">
				<li class="flex items-start gap-3">
					<span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-400 font-bold text-stone-950">1</span>
					<span>Crear cuenta acá nomás (email + contraseña).</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-400 font-bold text-stone-950">2</span>
					<span>Marcá los stickers que ya tenés en el catálogo.</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-400 font-bold text-stone-950">3</span>
					<span>Mostrale tu QR a otro coleccionista y el matcher hace el resto.</span>
				</li>
			</ul>

			<div class="mt-auto pt-10 text-xs text-stone-500">cambiaton.leandromoreno.com</div>
		</div>
	</aside>

	<main class="grid place-items-center bg-stone-50 px-4 py-10">
		<div class="w-full max-w-sm">
			<h2 class="text-xl font-bold tracking-tight text-stone-900">Crear cuenta</h2>
			<p class="mt-1 text-sm text-stone-600">Tres campos. Empezás vacío y vas sumando.</p>

			<form
				method="POST"
				class="mt-6 space-y-3"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						await update();
						loading = false;
						if (result.type === 'redirect') track('sign_up', { method: 'password' });
					};
				}}
			>
				<input
					type="text"
					name="nombre"
					required
					placeholder="Tu nombre"
					value={form?.nombre ?? ''}
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
				/>
				<input
					type="email"
					name="email"
					autocomplete="email"
					required
					placeholder="Email"
					value={form?.email ?? ''}
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
				/>
				<input
					type="password"
					name="password"
					autocomplete="new-password"
					required
					minlength="6"
					placeholder="Contraseña (mín 6 chars)"
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
				/>

				{#if form?.error}
					<div class="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
						{form.error}
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
				>
					{loading ? 'Creando…' : 'Crear cuenta'}
				</button>
			</form>

			<div class="mt-6 border-t border-stone-200 pt-4 text-center text-sm text-stone-600">
				¿Ya tenés cuenta? <a href="/login" class="font-semibold text-stone-900 hover:underline">Entrá</a>
			</div>
		</div>
	</main>
</div>
