<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { afterNavigate } from '$app/navigation';

	let { children } = $props();

	// La primera page_view la dispara el snippet de gtag en app.html. Las
	// navegaciones SPA siguientes las trackeamos manualmente acá.
	let primeraNavegacion = $state(true);
	afterNavigate(({ to }) => {
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
