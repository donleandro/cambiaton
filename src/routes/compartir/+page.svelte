<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { track } from '$lib/client/track';
	import { page } from '$app/state';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let loading = $state(false);

	onMount(() => {
		// Trackear si llegamos vía QR (link personal). Si no hay ?to=, fue un
		// acceso directo a /compartir — el page_view normal ya lo cubre.
		if (page.url.searchParams.has('to')) {
			track('arrival_via_qr', {
				destinatario_id: data.destinatario?.id ?? null,
				token_invalido: !!data.tokenInvalido
			});
		}
	});
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
						{#if data.aSiMismo}
							Sos vos mismo — pedíle a otro coleccionista que te pase su link.
						{:else if data.tokenInvalido}
							Ese link no nos llevó a nadie válido.
						{:else if data.destinatario && data.user && data.destinatario.id === data.user.id}
							Cargá la lista que te dictaron — queda como propuesta de intercambio contra tu
							colección.
						{:else if data.destinatario}
							Vas a compartir tu lista con
							<strong class="text-stone-900">{data.destinatario.nombre}</strong>. Te calculamos el
							intercambio óptimo entre ustedes dos.
						{:else}
							Necesitás abrir el link personal de un coleccionista para emparejarte con él.
						{/if}
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
		{#if data.tieneDataPropia && data.destinatario && data.user}
			<!-- Visitor logueado con data: 1-click usando colección actual. -->
			<div class="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
				<div class="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600">
					Ya tenés todo cargado
				</div>
				<h2 class="mt-1 text-xl font-black text-stone-900">
					Mandale tu colección actual a <span class="text-amber-700">{data.destinatario.nombre}</span>
				</h2>
				<p class="mt-2 text-sm text-stone-600">
					Vamos a comparar tu álbum actual con el suyo y a quedarle el match óptimo en sus
					Intercambios. No necesitás pegar ninguna lista.
				</p>

				<form
					method="POST"
					use:enhance={() => {
						loading = true;
						return async ({ result, update }) => {
							await update();
							loading = false;
							if (result.type === 'redirect') {
								track('compartir_submit', {
									destinatario_id: data.destinatario?.id ?? null,
									modo: 'actual'
								});
							}
						};
					}}
					class="mt-4 space-y-2"
				>
					<input type="hidden" name="modo" value="actual" />
					<button
						type="submit"
						disabled={loading}
						class="w-full rounded-lg bg-stone-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
					>
						{loading ? 'Enviando…' : `Mandar mi álbum a ${data.destinatario.nombre}`}
					</button>
				</form>

				<details class="mt-4 border-t border-stone-100 pt-3">
					<summary class="cursor-pointer text-xs font-semibold text-stone-600 hover:text-stone-900">
						¿Querés cargar una lista distinta? (ej. la de un amigo que te dictó)
					</summary>
					<p class="mt-2 text-xs text-stone-500">
						Esto crea un nuevo submitter anónimo con la lista que pegues — útil si estás
						compartiendo la lista de alguien que no tiene cuenta. Por defecto, dejá la opción de
						arriba.
					</p>
					<button
						type="button"
						onclick={() => {
							const u = new URL(window.location.href);
							u.searchParams.set('modo', 'pegar');
							window.location.href = u.toString();
						}}
						class="mt-2 text-xs font-semibold text-stone-900 underline"
					>
						Cargar otra lista en su lugar →
					</button>
				</details>
			</div>
		{:else if !data.destinatario || data.aSiMismo}
			<!-- Sin destinatario válido: no mostramos el form, mostramos guía. -->
			<div class="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-700 shadow-sm">
				<h2 class="text-base font-bold text-stone-900">
					{#if data.tokenInvalido}
						Link inválido o expirado
					{:else if data.aSiMismo}
						Sos vos mismo
					{:else}
						Necesitás un link personal para emparejarte
					{/if}
				</h2>

				<p class="mt-2">
					{#if data.tokenInvalido}
						El link que abriste apunta a una cuenta que ya no existe. Pedíle a la persona que te
						pase su link de nuevo.
					{:else if data.aSiMismo}
						No podés cambiar contigo mismo. Pedíle el link a otro coleccionista.
					{:else}
						La idea es que vos pegues tu lista y nosotros la comparemos contra la colección de la
						persona que te pasó su link (no contra la app en general). Sin link no sabemos con quién
						emparejarte.
					{/if}
				</p>

				{#if data.user}
					<div class="mt-4 rounded-lg bg-stone-50 p-3 text-xs">
						<p class="font-semibold text-stone-900">¿Querés que otros te compartan SU lista a vos?</p>
						<p class="mt-1 text-stone-600">
							Generá tu link personal en <a href="/mi-qr" class="font-semibold text-stone-900 underline">/mi-qr</a>
							y compartíselo por WhatsApp o como QR.
						</p>
					</div>
				{:else}
					<div class="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
						¿Ya tenés cuenta? <a href="/login" class="font-semibold text-stone-900 underline">Entrá</a>
						y generá tu link personal en <a href="/mi-qr" class="font-semibold text-stone-900 underline">/mi-qr</a>.
					</div>
				{/if}
			</div>
		{:else}
			<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ result, update }) => {
					await update();
					loading = false;
					if (result.type === 'redirect') {
						track('compartir_submit', {
							destinatario_id: data.destinatario?.id ?? null,
							has_token: typeof window !== 'undefined' ? new URL(window.location.href).searchParams.has('to') : false
						});
					}
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

			{#if !data.user}
				<div class="mt-6 border-t border-stone-200 pt-4 text-center text-sm text-stone-600">
					<a href="/login" class="font-semibold text-stone-900 hover:underline">Ya tengo cuenta</a>
					<span class="mx-2 text-stone-400">·</span>
					<a href="/registro" class="text-stone-700 hover:underline">Crear cuenta</a>
				</div>
			{/if}
		{/if}
	</div>
</div>
