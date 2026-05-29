<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	function gtagSet(): void {
		const w = window as unknown as { gtag?: (...args: unknown[]) => void };
		if (typeof w.gtag !== 'function') return;
		if (data.user) {
			// user_id en GA4: opaque id estable. Usamos el numeric internal id —
			// no es PII y permite cross-device tracking.
			w.gtag('set', { user_id: String(data.user.id) });
			w.gtag('set', 'user_properties', {
				is_admin: data.user.isAdmin,
				tiene_email: !!data.user.email
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
