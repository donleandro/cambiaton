<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let loading = $state(false);
	let copiado = $state(false);

	async function copiar(link: string) {
		try {
			await navigator.clipboard.writeText(link);
			copiado = true;
			setTimeout(() => (copiado = false), 1500);
		} catch {
			/* el usuario puede copiar a mano */
		}
	}
</script>

<svelte:head><title>Recuperar contraseña (admin) · Cambiatón</title></svelte:head>

<main class="mx-auto max-w-lg px-4 py-10">
	<h1 class="text-xl font-bold tracking-tight text-stone-900">Generar enlace de recuperación</h1>
	<p class="mt-1 text-sm text-stone-600">
		Elegí la cuenta y generá un magic link. Pasáselo a la persona por WhatsApp o donde sea: con
		él podrá poner una contraseña nueva sin que mandemos ningún correo. El enlace es de un solo
		uso y caduca.
	</p>

	<form
		method="POST"
		action="?/generar"
		class="mt-6 space-y-3"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update({ reset: false });
				loading = false;
			};
		}}
	>
		<label class="block">
			<span class="text-sm font-medium text-stone-700">Cuenta</span>
			<select
				name="userId"
				required
				class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
			>
				<option value="" disabled selected>Elegí una persona…</option>
				{#each data.usuarios as u (u.id)}
					<option value={u.id}>
						{u.nombre}{u.email ? ` — ${u.email}` : ' (sin email)'}
					</option>
				{/each}
			</select>
		</label>

		<label class="block">
			<span class="text-sm font-medium text-stone-700">Validez</span>
			<select
				name="ttl"
				class="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
			>
				<option value="60" selected>1 hora</option>
				<option value="180">3 horas</option>
				<option value="1440">24 horas</option>
			</select>
		</label>

		{#if form && !form.ok && form.error}
			<div class="rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
				{form.error}
			</div>
		{/if}

		<button
			type="submit"
			disabled={loading}
			class="w-full rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
		>
			{loading ? 'Generando…' : 'Generar enlace'}
		</button>
	</form>

	{#if form?.ok && form.link}
		<div class="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
			<p class="text-sm text-stone-700">
				Enlace para <span class="font-semibold">{form.nombre}</span>{form.email
					? ` (${form.email})`
					: ''} — vence en {form.ttlMin >= 60 ? `${form.ttlMin / 60} h` : `${form.ttlMin} min`}.
			</p>
			<div class="mt-2 flex items-stretch gap-2">
				<input
					readonly
					value={form.link}
					class="w-full rounded-md border border-stone-300 bg-white px-2 py-2 font-mono text-xs text-stone-800"
					onclick={(e) => e.currentTarget.select()}
				/>
				<button
					type="button"
					onclick={() => copiar(form.link)}
					class="shrink-0 rounded-md bg-stone-900 px-3 text-sm font-semibold text-white hover:bg-stone-800"
				>
					{copiado ? '¡Copiado!' : 'Copiar'}
				</button>
			</div>
			<p class="mt-2 text-xs text-stone-500">
				Es de un solo uso: cuando la persona ponga su contraseña, este enlace deja de servir.
			</p>
		</div>
	{/if}
</main>
