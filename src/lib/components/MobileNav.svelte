<script lang="ts">
	import { page } from '$app/state';

	type Props = {
		pendientes: number;
	};
	let { pendientes }: Props = $props();

	type Item = {
		href: string;
		label: string;
		icon: string;
		matches: (path: string) => boolean;
	};

	const items: Item[] = [
		{
			href: '/',
			label: 'Álbum',
			icon: 'M3 7l9-4 9 4-9 4-9-4zm0 6l9 4 9-4M3 17l9 4 9-4',
			matches: (p) => p === '/'
		},
		{
			href: '/cambiaton',
			label: 'Cambiatón',
			// Doble flecha de swap: ↑ derecha + ↓ izquierda
			icon: 'M4 8h13l-3-3m3 3l-3 3 M20 16H7l3-3m-3 3l3 3',
			matches: (p) => p.startsWith('/cambiaton')
		},
		{
			href: '/intercambios',
			label: 'Recibidos',
			icon: 'M3 7l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
			matches: (p) => p.startsWith('/intercambio')
		},
		{
			href: '/mi-qr',
			label: 'Mi QR',
			icon: 'M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z',
			matches: (p) => p.startsWith('/mi-qr')
		},
		{
			href: '/reportes',
			label: 'Reportes',
			icon: 'M3 21h18M5 21V10m4 11V6m4 15v-8m4 8V8m4 13V3',
			matches: (p) => p.startsWith('/reportes')
		}
	];

	const currentPath = $derived(page.url.pathname);
</script>

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur sm:hidden"
	style="padding-bottom: env(safe-area-inset-bottom);"
	aria-label="Navegación principal"
>
	<ul class="grid grid-cols-5">
		{#each items as it (it.href)}
			{@const active = it.matches(currentPath)}
			<li>
				<a
					href={it.href}
					aria-current={active ? 'page' : undefined}
					class="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition-colors {active
						? 'text-amber-700'
						: 'text-stone-500 hover:text-stone-900'}"
				>
					<span class="relative grid h-6 w-6 place-items-center">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
							<path d={it.icon} />
						</svg>
						{#if it.href === '/intercambios' && pendientes > 0}
							<span
								class="absolute -right-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white"
							>
								{pendientes}
							</span>
						{/if}
					</span>
					<span class="leading-none">{it.label}</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
