<script lang="ts">
	import { page } from '$app/state';

	type User = { id: number; nombre: string; email: string | null; isAdmin: boolean; token: string };

	type Props = {
		user: User | null;
		pendientes: number;
	};
	let { user, pendientes }: Props = $props();

	// Solo mostramos los links de desktop si NO estamos en esa misma ruta —
	// evita el doble nav cuando ya estás ahí (no hace daño, pero queda más limpio).
	const path = $derived(page.url.pathname);
</script>

<header class="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
		<!-- Logo + brand -->
		<a href="/" class="flex min-w-0 items-center gap-2.5">
			<span
				class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-stone-950"
				aria-hidden="true"
			>
				<svg
					viewBox="0 0 24 24"
					class="h-5 w-5 text-amber-400"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M6 8h12M15 5l3 3-3 3" />
					<path d="M18 16H6M9 13l-3 3 3 3" />
				</svg>
			</span>
			<div class="min-w-0">
				<div class="text-base font-black leading-tight tracking-tight text-stone-900">
					Cambiatón
				</div>
				<div class="text-[11px] leading-tight text-stone-500">
					Álbum Mundial 2026
				</div>
			</div>
		</a>

		<!-- Acciones principales -->
		<div class="flex shrink-0 items-center gap-2">
			<!-- Cargar lista (compartir): para anotar lo que te dictaron / dar QR a otro -->
			<a
				href="/compartir"
				class="flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 sm:px-3 sm:text-sm"
				title="Cargar una lista que te dictaron / ver el form público"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" stroke-linecap="round" stroke-linejoin="round">
					<!-- clipboard con líneas (cargar/pegar lista) -->
					<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
					<rect x="9" y="3" width="6" height="4" rx="1" />
					<path d="M9 13h6M9 17h4" />
				</svg>
				<span class="hidden sm:inline">Cargar lista</span>
			</a>

			<!-- Compartir mi QR (acción principal) -->
			{#if user}
				<a
					href="/mi-qr"
					class="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-stone-950 transition-colors hover:bg-amber-300 sm:text-sm"
					title="Mi QR para cambiar"
				>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						class="h-4 w-4"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z" />
					</svg>
					<span>Mi QR</span>
				</a>
			{/if}
		</div>
	</div>

	<!-- Desktop secondary nav (mobile uses bottom nav + buttons above) -->
	{#if user}
		<div class="mx-auto hidden max-w-6xl items-center gap-2 px-4 pb-2 sm:flex">
			<a
				href="/"
				aria-current={path === '/' ? 'page' : undefined}
				class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors {path === '/'
					? 'bg-stone-900 text-white'
					: 'text-stone-600 hover:bg-stone-100'}"
			>
				Álbum
			</a>
			<a
				href="/cambiaton"
				aria-current={path.startsWith('/cambiaton') ? 'page' : undefined}
				class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors {path.startsWith('/cambiaton')
					? 'bg-stone-900 text-white'
					: 'text-stone-600 hover:bg-stone-100'}"
			>
				Cambiatón
			</a>
			<a
				href="/intercambios"
				aria-current={path.startsWith('/intercambio') ? 'page' : undefined}
				class="relative rounded-md px-2.5 py-1 text-xs font-semibold transition-colors {path.startsWith(
					'/intercambio'
				)
					? 'bg-stone-900 text-white'
					: 'text-stone-600 hover:bg-stone-100'}"
			>
				Recibidos
				{#if pendientes > 0}
					<span class="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
						{pendientes}
					</span>
				{/if}
			</a>
			<a
				href="/reportes"
				aria-current={path.startsWith('/reportes') ? 'page' : undefined}
				class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors {path.startsWith(
					'/reportes'
				)
					? 'bg-stone-900 text-white'
					: 'text-stone-600 hover:bg-stone-100'}"
			>
				Reportes
			</a>
			{#if user.isAdmin}
				<a
					href="/admin/catalogo"
					aria-current={path.startsWith('/admin') ? 'page' : undefined}
					class="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
					title="Editar descripciones pendientes"
				>
					Admin
				</a>
			{/if}
			<span class="ml-auto text-xs text-stone-500">{user.nombre}</span>
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="rounded-md border border-stone-300 px-2 py-0.5 text-xs text-stone-600 hover:bg-stone-50"
					title="Cerrar sesión"
				>
					Salir
				</button>
			</form>
		</div>
	{/if}
</header>
