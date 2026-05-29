/**
 * Wrapper para gtag — seguro de llamar en SSR (no-op) y antes de que el
 * snippet de gtag.js termine de cargar (queda en dataLayer).
 *
 * GA4 limita 25 params por evento; valores deben ser primitivos.
 */
type EventParams = Record<string, string | number | boolean | null | undefined>;

export function track(name: string, params: EventParams = {}): void {
	if (typeof window === 'undefined') return;
	const w = window as unknown as {
		gtag?: (...args: unknown[]) => void;
		dataLayer?: unknown[];
	};
	// gtag se define en app.html antes que cualquier code-split. Si por algún
	// motivo no está, pusheamos directo a dataLayer.
	if (typeof w.gtag === 'function') {
		w.gtag('event', name, params);
		return;
	}
	if (Array.isArray(w.dataLayer)) {
		w.dataLayer.push({ event: name, ...params });
	}
}
