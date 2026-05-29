<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import MobileNav from '$lib/components/MobileNav.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	// Rutas donde NO queremos la bottom nav (landings auth + el form de exito
	// que ya tiene su propio CTA). Todo lo demás logueado la muestra.
	const SIN_NAV = new Set(['/login', '/registro', '/reclamar']);
	const mostrarNav = $derived(!!data.user && !SIN_NAV.has(page.url.pathname));

	function gtagSet(): void {
		const w = window as unknown as { gtag?: (...args: unknown[]) => void };
		if (typeof w.gtag !== 'function') return;
		if (data.user) {
			// user_id en GA4: opaque id estable. Usamos el numeric internal id —
			// no es PII y permite cross-device tracking.
			w.gtag('set', { user_id: String(data.user.id) });
			w.gtag('set', 'user_properties', {
				is_admin: data.user.isAdmin,
				tiene_email: !!data.user.email,
				pct_bucket: data.stats?.bucket ?? '0',
				is_completo: data.stats ? data.stats.pct >= 100 : false,
				tiene_repetidas: (data.stats?.tengo ?? 0) > 0
			});
		} else {
			w.gtag('set', { user_id: undefined });
		}
	}

	onMount(gtagSet);

	let primeraNavegacion = $state(true);
	afterNavigate(({ to }) => {
		// Re-aplica user_id por si la sesión cambió (login/logout/claim).
		gtagSet();

		if (primeraNavegacion) {
			primeraNavegacion = false;
			return;
		}
		const w = window as unknown as { gtag?: (...args: unknown[]) => void };
		if (typeof w.gtag === 'function' && to?.url) {
			w.gtag('event', 'page_view', {
				page_path: to.url.pathname + to.url.search,
				page_location: to.url.href
			});
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
{#if mostrarNav}
	<MobileNav pendientes={data.pendientes} />
	<!-- Espaciador para que el contenido scrollee debajo de la bottom nav -->
	<div class="pb-16 sm:pb-0" aria-hidden="true"></div>
{/if}
