<script lang="ts">
	import { enhance } from '$app/forms';
	import { track } from '$lib/client/track';
	import favicon from '$lib/assets/favicon.svg';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
</script>

<svelte:head><title>Entrar · Cambiatón</title></svelte:head>

<div class="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
	<!-- Hero / marketing -->
	<aside class="relative overflow-hidden bg-stone-950 px-6 py-10 text-stone-100 lg:px-12 lg:py-14">
		<!-- patrón de puntos de fondo -->
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
					Tu álbum del<br />
					<span class="text-amber-400">Mundial 2026</span><br />
					sin caos.
				</h1>
				<p class="mt-5 max-w-md text-base text-stone-400 lg:text-lg">
					980 stickers. Marcá lo que tenés, encontrá los faltantes, y emparejá intercambios
					óptimos con tus amigos vía un QR.
				</p>
			</div>

			<ul class="mt-8 space-y-3 text-sm text-stone-300 lg:mt-10">
				<li class="flex items-start gap-3">
					<span
						class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-400 font-bold text-stone-950"
					>✓</span>
					<span>Trackeá tengo y repetidas en tiempo real, con filtros por confederación y equipo.</span>
				</li>
				<li class="flex items-start gap-3">
					<span
						class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-400 font-bold text-stone-950"
					>⇄</span>
					<span>Matcher automático: ves exactamente quién te puede dar qué.</span>
				</li>
				<li class="flex items-start gap-3">
					<span
						class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-400 font-bold text-stone-950"
					>⚡</span>
					<span>Tu QR personal: tus amigos pegan su lista y queda como propuesta en <code class="rounded bg-stone-800 px-1 font-mono text-xs">/intercambios</code>.</span>
				</li>
			</ul>

			<div class="mt-auto pt-10 text-xs text-stone-500">
				cambiaton.leandromoreno.com
			</div>
		</div>
	</aside>

	<!-- Form -->
	<main class="grid place-items-center bg-stone-50 px-4 py-10">
		<div class="w-full max-w-sm">
			<h2 class="text-xl font-bold tracking-tight text-stone-900">Entrá</h2>
			<p class="mt-1 text-sm text-stone-600">Con tu email y contraseña.</p>

			<form
				method="POST"
				class="mt-6 space-y-3"
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
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
					placeholder="Email"
				/>
				<input
					type="password"
					name="password"
					autocomplete="current-password"
					required
					class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
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
					class="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
				>
					{loading ? 'Entrando…' : 'Entrar'}
				</button>
			</form>

			<div class="mt-6 border-t border-stone-200 pt-4 text-center text-sm text-stone-600">
				¿No tenés cuenta? <a href="/registro" class="font-semibold text-stone-900 hover:underline">Crear una</a>
			</div>
			<div class="mt-2 text-center text-xs text-stone-500">
				¿Olvidaste tu contraseña? Pedile al administrador un enlace de recuperación.
			</div>
			<div class="mt-2 text-center text-xs text-stone-500">
				¿Te pasaron un link? <a href="/compartir" class="underline hover:text-stone-700">Compartí tu lista sin cuenta</a>
			</div>
		</div>
	</main>
</div>
