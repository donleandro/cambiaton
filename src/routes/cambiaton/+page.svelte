<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { track } from '$lib/client/track';
	import { enqueue, flush, count as colaCount } from '$lib/client/offline-queue';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Step = 0 | 1 | 2 | 3;
	type Inicio = 'mis-faltantes' | 'mis-repetidas';

	let step = $state<Step>(0);
	let inicio = $state<Inicio | null>(null);

	let recibo = $state<Record<string, boolean>>({});
	let doy = $state<Record<string, boolean>>({});
	let contraparte = $state('');

	// --- Persistencia de la selección (tema 4) ----------------------------------
	// El cambiatón se hace en vivo; un F5 accidental o una recarga de inventario
	// no deben borrar lo ya marcado. Guardamos un borrador en localStorage.
	const DRAFT_KEY = 'cambiaton-draft-v1';

	function guardarBorrador() {
		if (!browser) return;
		try {
			localStorage.setItem(DRAFT_KEY, JSON.stringify({ inicio, step, recibo, doy, contraparte }));
		} catch {
			/* storage lleno o bloqueado: no es crítico */
		}
	}

	let restaurado = $state(false);
	let avisoReconciliado = $state('');

	function restaurarBorrador() {
		if (!browser || restaurado) return;
		restaurado = true;
		try {
			const raw = localStorage.getItem(DRAFT_KEY);
			if (!raw) return;
			const d = JSON.parse(raw);
			if (d.inicio === 'mis-faltantes' || d.inicio === 'mis-repetidas') inicio = d.inicio;
			if (typeof d.step === 'number' && d.step >= 0 && d.step <= 3) step = d.step as Step;
			if (d.recibo && typeof d.recibo === 'object') recibo = d.recibo;
			if (d.doy && typeof d.doy === 'object') doy = d.doy;
			if (typeof d.contraparte === 'string') contraparte = d.contraparte;
			reconciliar();
		} catch {
			/* borrador corrupto: lo ignoramos */
		}
	}

	// Saca de la selección los IDs que ya no están en el inventario (porque el
	// catálogo cambió desde otro lado: import, edición, etc.).
	function reconciliar(): number {
		const validFalt = new Set(data.misFaltantes.map((s) => s.id));
		const validRep = new Set(data.misRepetidas.map((s) => s.id));
		let quitados = 0;
		for (const id of Object.keys(recibo)) {
			if (recibo[id] && !validFalt.has(id)) {
				delete recibo[id];
				quitados++;
			}
		}
		for (const id of Object.keys(doy)) {
			if (doy[id] && !validRep.has(id)) {
				delete doy[id];
				quitados++;
			}
		}
		return quitados;
	}

	let recargando = $state(false);
	async function recargarInventario() {
		recargando = true;
		avisoReconciliado = '';
		await invalidateAll();
		const quitados = reconciliar();
		recargando = false;
		avisoReconciliado =
			quitados > 0
				? `Inventario actualizado. ${quitados} selección(es) ya no existían y se quitaron.`
				: 'Inventario actualizado. Tu selección sigue intacta.';
		track('cambiaton_recargar', { quitados });
	}

	// Restaura al montar (en el cliente) y persiste ante cualquier cambio.
	$effect(() => {
		restaurarBorrador();
	});
	$effect(() => {
		// dependencias: re-corre y persiste cuando cambian
		void [inicio, step, JSON.stringify(recibo), JSON.stringify(doy), contraparte];
		if (restaurado) guardarBorrador();
	});

	function limpiarTodo() {
		recibo = {};
		doy = {};
		contraparte = '';
		inicio = null;
		step = 0;
		avisoReconciliado = '';
		if (browser) {
			try {
				localStorage.removeItem(DRAFT_KEY);
			} catch {
				/* noop */
			}
		}
	}

	// --- Online / cola offline ---------------------------------------------------
	let online = $state(true);
	let pendientes = $state(0);
	let sincronizando = $state(false);
	let aplicando = $state(false);
	let resultadoMsg = $state('');
	let resultadoTono = $state<'ok' | 'cola' | 'error'>('ok');

	$effect(() => {
		if (!browser) return;
		online = navigator.onLine;
		pendientes = colaCount();
		const onOnline = () => {
			online = true;
			sincronizar();
		};
		const onOffline = () => {
			online = false;
		};
		window.addEventListener('online', onOnline);
		window.addEventListener('offline', onOffline);
		sincronizar();
		return () => {
			window.removeEventListener('online', onOnline);
			window.removeEventListener('offline', onOffline);
		};
	});

	async function sincronizar() {
		if (!browser || !navigator.onLine || colaCount() === 0 || sincronizando) return;
		sincronizando = true;
		const r = await flush();
		pendientes = colaCount();
		sincronizando = false;
		if (r.done > 0) {
			resultadoTono = 'ok';
			resultadoMsg = `Se sincronizaron ${r.done} cambio(s) que estaban pendientes.`;
			await invalidateAll();
		}
	}

	function nuevoOpId(): string {
		if (browser && 'randomUUID' in crypto) return crypto.randomUUID();
		return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
	}

	async function aplicar() {
		if (!balanceado || unoAuno === 0 || aplicando) return;
		aplicando = true;
		resultadoMsg = '';
		const opId = nuevoOpId();
		const action = '/cambiaton?/confirmar';
		const fields = {
			dados: idsDoy.join(','),
			recibidos: idsRecibo.join(','),
			contraparte,
			inicio: inicio ?? '',
			opId
		};
		const label = `${unoAuno} ↔ ${unoAuno}${contraparte ? ' con ' + contraparte : ''}`;

		const aLaCola = (motivo: string) => {
			enqueue({ opId, action, fields, ts: Date.now(), label });
			pendientes = colaCount();
			track('cambiaton_encolado', { dados: nDoy, recibidos: nRecibo });
			resultadoTono = 'cola';
			resultadoMsg = `${motivo}: guardé el cambio (${label}). Se aplica solo cuando vuelva la señal.`;
			limpiarTodo();
		};

		if (!navigator.onLine) {
			aLaCola('Sin internet');
			aplicando = false;
			return;
		}

		try {
			const res = await fetch(action, {
				method: 'POST',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams(fields).toString()
			});
			if (res.ok) {
				track('cambiaton_confirmar', { dados: nDoy, recibidos: nRecibo, unoAuno, inicio });
				resultadoTono = 'ok';
				resultadoMsg = `✓ Intercambio aplicado y registrado (${label}).`;
				limpiarTodo();
				await invalidateAll();
			} else {
				resultadoTono = 'error';
				resultadoMsg = 'No se pudo aplicar (error del servidor). Probá de nuevo.';
			}
		} catch {
			// La red se cortó justo al enviar. Idempotente: encolar no duplica.
			aLaCola('Se cortó la conexión');
		}
		aplicando = false;
	}

	// El paso 1 muestra la lista elegida en el paso 0; el paso 2 la otra.
	const step1Tipo = $derived<'faltantes' | 'repetidas' | null>(
		inicio === 'mis-faltantes' ? 'faltantes' : inicio === 'mis-repetidas' ? 'repetidas' : null
	);
	const step2Tipo = $derived<'faltantes' | 'repetidas' | null>(
		inicio === 'mis-faltantes' ? 'repetidas' : inicio === 'mis-repetidas' ? 'faltantes' : null
	);

	function elegirInicio(opt: Inicio) {
		inicio = opt;
		step = 1;
		track('cambiaton_inicio', { tipo: opt });
	}

	let searchFalt = $state('');
	let grupoFalt = $state('');
	let soloSelFalt = $state(false);
	let searchRep = $state('');
	let grupoRep = $state('');
	let soloSelRep = $state(false);

	const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

	const filtFaltantes = $derived(
		data.misFaltantes.filter((s) => {
			if (soloSelFalt && !recibo[s.id]) return false;
			if (grupoFalt && s.grupo !== grupoFalt) return false;
			if (searchFalt) {
				const q = searchFalt.toLowerCase();
				if (
					!s.id.toLowerCase().includes(q) &&
					!s.equipo.toLowerCase().includes(q) &&
					!String(s.numero).includes(q)
				)
					return false;
			}
			return true;
		})
	);

	const filtRepetidas = $derived(
		data.misRepetidas.filter((s) => {
			if (soloSelRep && !doy[s.id]) return false;
			if (grupoRep && s.grupo !== grupoRep) return false;
			if (searchRep) {
				const q = searchRep.toLowerCase();
				if (
					!s.id.toLowerCase().includes(q) &&
					!s.equipo.toLowerCase().includes(q) &&
					!String(s.numero).includes(q)
				)
					return false;
			}
			return true;
		})
	);

	const idsRecibo = $derived(Object.keys(recibo).filter((k) => recibo[k]));
	const idsDoy = $derived(Object.keys(doy).filter((k) => doy[k]));

	const stickersRecibo = $derived(data.misFaltantes.filter((s) => recibo[s.id]));
	const stickersDoy = $derived(data.misRepetidas.filter((s) => doy[s.id]));

	// --- Cambio 1:1 (tema 1) -----------------------------------------------------
	const nDoy = $derived(idsDoy.length);
	const nRecibo = $derived(idsRecibo.length);
	const unoAuno = $derived(Math.min(nDoy, nRecibo));
	const sobranDoy = $derived(Math.max(0, nDoy - nRecibo)); // tengo de más para dar
	const faltanDoy = $derived(Math.max(0, nRecibo - nDoy)); // necesito dar más
	const balanceado = $derived(nDoy === nRecibo);

	// --- Alternativas / segunda verificación (tema 2) ----------------------------
	// Cuando un lado quedó corto (porque al re-chequear la otra persona no tenía
	// algo y lo destildaste), mostramos las opciones del lado corto que todavía
	// no elegiste, para cerrar el 1:1. Las ya seleccionadas salen del pool solas.
	let searchAlt = $state('');
	const altLado = $derived<'recibo' | 'doy' | null>(
		sobranDoy > 0 ? 'recibo' : faltanDoy > 0 ? 'doy' : null
	);
	const altCandidatos = $derived(
		altLado === 'recibo'
			? data.misFaltantes.filter((s) => !recibo[s.id])
			: altLado === 'doy'
				? data.misRepetidas.filter((s) => !doy[s.id])
				: []
	);
	const altFiltrados = $derived(
		altCandidatos.filter((s) => {
			if (!searchAlt) return true;
			const q = searchAlt.toLowerCase();
			return (
				s.id.toLowerCase().includes(q) ||
				s.equipo.toLowerCase().includes(q) ||
				String(s.numero).includes(q)
			);
		})
	);
	function toggleAlt(id: string) {
		if (altLado === 'recibo') recibo[id] = !recibo[id];
		else if (altLado === 'doy') doy[id] = !doy[id];
	}

	function nextStep() {
		if (step < 3) step = (step + 1) as Step;
	}
	function prevStep() {
		if (step > 0) step = (step - 1) as Step;
	}

	const mostrarFaltantes = $derived(
		(step === 1 && step1Tipo === 'faltantes') || (step === 2 && step2Tipo === 'faltantes')
	);
	const mostrarRepetidas = $derived(
		(step === 1 && step1Tipo === 'repetidas') || (step === 2 && step2Tipo === 'repetidas')
	);
	const stepDeFaltantes = $derived<Step>(step1Tipo === 'faltantes' ? 1 : 2);
	const stepDeRepetidas = $derived<Step>(step1Tipo === 'repetidas' ? 1 : 2);
</script>

<svelte:head><title>Cambiatón en vivo · Álbum 2026</title></svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-900">
	<header class="border-b border-stone-200 bg-white">
		<div class="mx-auto max-w-4xl px-4 py-3">
			<div class="flex items-center justify-between">
				<h1 class="text-lg font-bold tracking-tight">Cambiatón en vivo</h1>
				<a href="/" class="text-sm text-stone-600 hover:text-stone-900">← Salir</a>
			</div>
			{#if inicio}
				{@const labels = [
					'Elegir inicio',
					step1Tipo === 'faltantes' ? 'Mis faltantes' : 'Mis repetidas',
					step2Tipo === 'faltantes' ? 'Mis faltantes' : 'Mis repetidas',
					'Confirmar'
				]}
				<div class="mt-3 flex items-center gap-2">
					{#each [1, 2, 3] as n (n)}
						<div class="flex flex-1 items-center gap-2">
							<button
								type="button"
								onclick={() => (step = n as Step)}
								class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors {step ===
								n
									? 'bg-stone-900 text-white'
									: step > n
										? 'bg-emerald-500 text-white'
										: 'bg-stone-200 text-stone-500'}"
							>
								{step > n ? '✓' : n}
							</button>
							<div class="min-w-0 flex-1">
								<div
									class="truncate text-xs font-medium {step === n
										? 'text-stone-900'
										: 'text-stone-500'}"
								>
									{labels[n]}
								</div>
							</div>
							{#if n < 3}
								<div class="h-px flex-1 bg-stone-200"></div>
							{/if}
						</div>
					{/each}
				</div>

				{#if mostrarFaltantes}
					<div class="mt-3 flex flex-wrap gap-2">
						<input
							type="search"
							placeholder="Buscar en faltantes (ID, equipo o número)…"
							bind:value={searchFalt}
							class="min-w-[180px] flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
						/>
						<select
							bind:value={grupoFalt}
							class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
						>
							<option value="">Todos los grupos</option>
							{#each GRUPOS as g (g)}
								<option value={g}>Grupo {g}</option>
							{/each}
						</select>
						<button
							type="button"
							onclick={() => (soloSelFalt = !soloSelFalt)}
							class="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors {soloSelFalt
								? 'border-emerald-400 bg-emerald-50 text-emerald-700'
								: 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'}"
						>
							{soloSelFalt ? '✓ ' : ''}Solo seleccionadas ({nRecibo})
						</button>
					</div>
				{:else if mostrarRepetidas}
					<div class="mt-3 flex flex-wrap gap-2">
						<input
							type="search"
							placeholder="Buscar en repetidas (ID, equipo o número)…"
							bind:value={searchRep}
							class="min-w-[180px] flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
						/>
						<select
							bind:value={grupoRep}
							class="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
						>
							<option value="">Todos los grupos</option>
							{#each GRUPOS as g (g)}
								<option value={g}>Grupo {g}</option>
							{/each}
						</select>
						<button
							type="button"
							onclick={() => (soloSelRep = !soloSelRep)}
							class="rounded-lg border px-3 py-2 text-sm font-semibold transition-colors {soloSelRep
								? 'border-amber-400 bg-amber-50 text-amber-700'
								: 'border-stone-300 bg-white text-stone-600 hover:bg-stone-50'}"
						>
							{soloSelRep ? '✓ ' : ''}Solo seleccionadas ({nDoy})
						</button>
					</div>
				{/if}
			{/if}
		</div>
	</header>

	<div class="mx-auto max-w-4xl px-4 py-5">
		{#if resultadoMsg}
			<div
				class="mb-4 rounded-md border p-3 text-sm {resultadoTono === 'ok'
					? 'border-emerald-200 bg-emerald-50 text-emerald-800'
					: resultadoTono === 'cola'
						? 'border-amber-200 bg-amber-50 text-amber-800'
						: 'border-rose-200 bg-rose-50 text-rose-700'}"
			>
				{resultadoMsg}
				{#if resultadoTono === 'ok'}
					<button class="ml-2 underline" onclick={() => goto('/')}>Ver catálogo</button>
				{/if}
			</div>
		{/if}

		{#if pendientes > 0}
			<div class="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
				⏳ {pendientes} cambio(s) en cola esperando internet.
				{#if online}
					<button class="ml-1 underline" onclick={sincronizar} disabled={sincronizando}>
						{sincronizando ? 'Sincronizando…' : 'Sincronizar ahora'}
					</button>
				{:else}
					Estás sin conexión.
				{/if}
			</div>
		{/if}

		{#if avisoReconciliado}
			<div class="mb-4 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
				{avisoReconciliado}
			</div>
		{/if}

		{#if step === 0}
			<section>
				<h2 class="mb-2 text-xl font-bold">¿Por dónde empezamos?</h2>
				<p class="mb-5 text-sm text-stone-600">
					Elegí qué lista mirar primero. Eso suele depender de quién tiene el álbum en la mano.
				</p>

				<div class="grid gap-3 md:grid-cols-2">
					<button
						type="button"
						onclick={() => elegirInicio('mis-faltantes')}
						class="rounded-lg border border-emerald-200 bg-white p-5 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50"
					>
						<div class="mb-1 text-base font-bold text-emerald-700">Empezar por mis faltantes</div>
						<div class="text-sm text-stone-600">
							Vos leés tus faltantes en voz alta. La otra persona te dice cuáles tiene repetidas y
							las marcás. Después seguimos con tus repetidas.
						</div>
						<div class="mt-3 text-xs font-semibold text-emerald-700">
							{data.misFaltantes.length} faltantes → revisás primero
						</div>
					</button>

					<button
						type="button"
						onclick={() => elegirInicio('mis-repetidas')}
						class="rounded-lg border border-amber-200 bg-white p-5 text-left transition-colors hover:border-amber-400 hover:bg-amber-50"
					>
						<div class="mb-1 text-base font-bold text-amber-700">Empezar por mis repetidas</div>
						<div class="text-sm text-stone-600">
							La otra persona te dice qué le falta. Vos buscás en tus repetidas y marcás las que
							tengas. Después revisamos tus faltantes.
						</div>
						<div class="mt-3 text-xs font-semibold text-amber-700">
							{data.misRepetidas.length} repetidas → revisás primero
						</div>
					</button>
				</div>

				{#if idsDoy.length > 0 || idsRecibo.length > 0}
					<div class="mt-4 rounded-md border border-stone-200 bg-white p-3 text-sm text-stone-600">
						Tenés un cambio en curso ({nDoy} doy · {nRecibo} recibo).
						<button class="ml-1 font-semibold text-stone-900 underline" onclick={() => (step = 3)}
							>Retomar</button
						>
						<button class="ml-2 text-stone-500 underline" onclick={limpiarTodo}
							>Empezar de cero</button
						>
					</div>
				{/if}
			</section>
		{:else if mostrarFaltantes}
			<section>
				<h2 class="mb-1 text-lg font-semibold">
					Paso {step} · Mis faltantes — ¿cuáles tiene él/ella?
				</h2>
				<p class="mb-3 text-sm text-stone-600">
					Marcá las que la otra persona tenga repetidas. Seleccionados:
					<strong>{nRecibo}</strong>.
				</p>

				<div class="mb-3 text-xs text-stone-500">
					Mostrando {filtFaltantes.length} de {data.misFaltantes.length} faltantes
				</div>

				<ul class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
					{#each filtFaltantes as s (s.id)}
						<li>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors {recibo[
									s.id
								]
									? 'border-emerald-300 bg-emerald-50'
									: 'border-stone-200 bg-white hover:bg-stone-50'}"
							>
								<input
									type="checkbox"
									bind:checked={recibo[s.id]}
									class="h-4 w-4 shrink-0 accent-emerald-600"
								/>
								{#if s.grupo}
									<span
										class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
										>{s.grupo}</span
									>
								{/if}
								<span class="min-w-0 flex-1">
									<span class="block font-mono text-xs font-bold">{s.id}</span>
									<span class="block truncate text-xs text-stone-600">{s.equipo}</span>
								</span>
							</label>
						</li>
					{:else}
						<li
							class="col-span-full rounded-md border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500"
						>
							{soloSelFalt ? 'No marcaste ninguna todavía.' : 'Sin faltantes con esos filtros.'}
						</li>
					{/each}
				</ul>
			</section>
		{:else if mostrarRepetidas}
			<section>
				<h2 class="mb-1 text-lg font-semibold">
					Paso {step} · Mis repetidas — ¿cuáles necesita él/ella?
				</h2>
				<p class="mb-3 text-sm text-stone-600">
					Marcá las que la otra persona necesite. Seleccionados:
					<strong>{nDoy}</strong>.
				</p>

				<div class="mb-3 text-xs text-stone-500">
					Mostrando {filtRepetidas.length} de {data.misRepetidas.length} repetidas
				</div>

				<ul class="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
					{#each filtRepetidas as s (s.id)}
						<li>
							<label
								class="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm transition-colors {doy[
									s.id
								]
									? 'border-amber-300 bg-amber-50'
									: 'border-stone-200 bg-white hover:bg-stone-50'}"
							>
								<input
									type="checkbox"
									bind:checked={doy[s.id]}
									class="h-4 w-4 shrink-0 accent-amber-600"
								/>
								{#if s.grupo}
									<span
										class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
										>{s.grupo}</span
									>
								{/if}
								<span class="min-w-0 flex-1">
									<span class="block font-mono text-xs font-bold">{s.id}</span>
									<span class="block truncate text-xs text-stone-600">{s.equipo}</span>
								</span>
								{#if s.repetidas > 1}
									<span class="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800"
										>×{s.repetidas}</span
									>
								{/if}
							</label>
						</li>
					{:else}
						<li
							class="col-span-full rounded-md border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500"
						>
							{soloSelRep ? 'No marcaste ninguna todavía.' : 'Sin repetidas con esos filtros.'}
						</li>
					{/each}
				</ul>
			</section>
		{:else if step === 3}
			<section>
				<h2 class="mb-1 text-lg font-semibold">Paso 3 · Confirmar intercambio</h2>
				<p class="mb-4 text-sm text-stone-600">
					El cambio es <strong>siempre 1 a 1</strong>: tiene que quedar la misma cantidad de cada
					lado. Si un lado quedó corto, agregá alternativas abajo o sacá del otro.
				</p>

				<div class="grid gap-4 md:grid-cols-2">
					<div>
						<h3 class="mb-2 flex items-center justify-between border-b border-stone-200 pb-1">
							<span class="font-semibold"
								>Yo recibo <span class="text-stone-500">({nRecibo})</span></span
							>
							<button
								type="button"
								onclick={() => (step = stepDeFaltantes)}
								class="text-xs text-stone-500 hover:text-stone-900"
								>Editar paso {stepDeFaltantes}</button
							>
						</h3>
						<ul class="space-y-1">
							{#each stickersRecibo as s (s.id)}
								<li
									class="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-2 text-sm"
								>
									{#if s.grupo}<span
											class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
											>{s.grupo}</span
										>{/if}
									<span class="font-mono text-sm font-bold">{s.id}</span>
									<span class="flex-1 truncate text-stone-700">{s.equipo}</span>
									<button
										type="button"
										onclick={() => (recibo[s.id] = false)}
										title="Quitar (la otra persona no la tenía)"
										class="text-stone-400 hover:text-rose-600">✕</button
									>
								</li>
							{:else}
								<li
									class="rounded-md border border-dashed border-stone-300 p-3 text-center text-sm text-stone-500"
								>
									Nada en este lado.
								</li>
							{/each}
						</ul>
					</div>

					<div>
						<h3 class="mb-2 flex items-center justify-between border-b border-stone-200 pb-1">
							<span class="font-semibold">Yo doy <span class="text-stone-500">({nDoy})</span></span>
							<button
								type="button"
								onclick={() => (step = stepDeRepetidas)}
								class="text-xs text-stone-500 hover:text-stone-900"
								>Editar paso {stepDeRepetidas}</button
							>
						</h3>
						<ul class="space-y-1">
							{#each stickersDoy as s (s.id)}
								<li
									class="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm"
								>
									{#if s.grupo}<span
											class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
											>{s.grupo}</span
										>{/if}
									<span class="font-mono text-sm font-bold">{s.id}</span>
									<span class="flex-1 truncate text-stone-700">{s.equipo}</span>
									<button
										type="button"
										onclick={() => (doy[s.id] = false)}
										title="Quitar (no se la voy a dar)"
										class="text-stone-400 hover:text-rose-600">✕</button
									>
								</li>
							{:else}
								<li
									class="rounded-md border border-dashed border-stone-300 p-3 text-center text-sm text-stone-500"
								>
									Nada en este lado.
								</li>
							{/each}
						</ul>
					</div>
				</div>

				<!-- Resumen 1:1 (tema 1) -->
				<div
					class="mt-5 rounded-md border bg-white p-3 text-sm {balanceado
						? 'border-emerald-200'
						: 'border-amber-200'}"
				>
					<div class="flex items-center gap-2 text-base">
						<span class="font-semibold">Cambio 1 a 1:</span>
						<span class="rounded bg-stone-900 px-2 py-0.5 font-bold text-white"
							>{unoAuno} figuritas</span
						>
					</div>
					{#if balanceado && unoAuno > 0}
						<p class="mt-1 text-emerald-700">Balanceado: {nDoy} doy ↔ {nRecibo} recibo.</p>
					{:else if sobranDoy > 0}
						<p class="mt-1 text-amber-700">
							Te <strong>sobran {sobranDoy}</strong> para dar. Agregá {sobranDoy} a "recibo" para emparejar,
							o quedan para el próximo cambio.
						</p>
					{:else if faltanDoy > 0}
						<p class="mt-1 text-amber-700">
							Te <strong>faltan {faltanDoy}</strong> para dar. Agregá {faltanDoy} a "doy" para emparejar.
						</p>
					{/if}
				</div>

				<!-- Alternativas / segunda verificación (tema 2) -->
				{#if altLado}
					<div class="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
						<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
							<h3 class="text-sm font-semibold">
								Agregar alternativas a <span
									class={altLado === 'recibo' ? 'text-emerald-700' : 'text-amber-700'}
									>{altLado === 'recibo' ? 'recibo' : 'doy'}</span
								>
								<span class="text-stone-500">(las que ya elegiste salen del listado)</span>
							</h3>
							<input
								type="search"
								placeholder="Buscar…"
								bind:value={searchAlt}
								class="min-w-[140px] rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-stone-500 focus:outline-none"
							/>
						</div>
						<ul
							class="grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4"
						>
							{#each altFiltrados.slice(0, 60) as s (s.id)}
								<li>
									<button
										type="button"
										onclick={() => toggleAlt(s.id)}
										class="flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm transition-colors {altLado ===
										'recibo'
											? 'border-stone-200 bg-white hover:border-emerald-300 hover:bg-emerald-50'
											: 'border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50'}"
									>
										{#if s.grupo}<span
												class="rounded bg-stone-900 px-1 py-0.5 font-mono text-[10px] font-bold text-white"
												>{s.grupo}</span
											>{/if}
										<span class="min-w-0 flex-1">
											<span class="block font-mono text-xs font-bold">{s.id}</span>
											<span class="block truncate text-xs text-stone-600">{s.equipo}</span>
										</span>
										<span class="text-stone-400">＋</span>
									</button>
								</li>
							{:else}
								<li class="col-span-full p-3 text-center text-sm text-stone-500">
									No quedan opciones para agregar.
								</li>
							{/each}
						</ul>
						{#if altFiltrados.length > 60}
							<p class="mt-2 text-xs text-stone-500">
								Mostrando 60 de {altFiltrados.length}. Afiná con la búsqueda.
							</p>
						{/if}
					</div>
				{/if}

				<div class="mt-4 space-y-3">
					<label class="block">
						<span class="mb-1 block text-sm font-medium text-stone-700"
							>¿Con quién cambiaste? <span class="text-stone-400">(opcional)</span></span
						>
						<input
							type="text"
							bind:value={contraparte}
							placeholder="Ej: Juan, primo de la feria…"
							maxlength="80"
							class="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-stone-500 focus:outline-none"
						/>
					</label>
					<button
						type="button"
						onclick={aplicar}
						disabled={!balanceado || unoAuno === 0 || aplicando}
						class="w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
					>
						{#if aplicando}
							Aplicando…
						{:else if !online}
							Guardar para aplicar al volver la señal ({unoAuno} ↔ {unoAuno})
						{:else if balanceado && unoAuno > 0}
							Aplicar y registrar intercambio ({unoAuno} ↔ {unoAuno})
						{:else}
							Emparejá para poder aplicar
						{/if}
					</button>
					{#if !online && balanceado && unoAuno > 0}
						<p class="text-center text-xs text-amber-700">
							Sin internet: el cambio se guarda y se aplica solo cuando vuelva la señal.
						</p>
					{:else if unoAuno === 0}
						<p class="text-center text-xs text-stone-500">Elegí al menos una de cada lado.</p>
					{:else if !balanceado}
						<p class="text-center text-xs text-amber-700">
							No está parejo: {sobranDoy > 0
								? `sacá ${sobranDoy} de "doy" o agregá ${sobranDoy} a "recibo"`
								: `sacá ${faltanDoy} de "recibo" o agregá ${faltanDoy} a "doy"`}. La transferencia
							siempre es 1 a 1.
						</p>
					{/if}
				</div>
			</section>
		{/if}
	</div>

	{#if step > 0}
		<nav class="sticky bottom-0 border-t border-stone-200 bg-white/95 backdrop-blur">
			<div class="mx-auto max-w-4xl px-4 py-2">
				<!-- Resumen siempre visible (tema 5) -->
				<div class="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
					<div class="flex items-center gap-2">
						<span class="rounded bg-amber-100 px-2 py-0.5 font-semibold text-amber-800"
							>Doy {nDoy}</span
						>
						<span class="rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800"
							>Recibo {nRecibo}</span
						>
						<span class="rounded bg-stone-900 px-2 py-0.5 font-semibold text-white"
							>1:1 = {unoAuno}</span
						>
					</div>
					<button
						type="button"
						onclick={recargarInventario}
						disabled={recargando}
						class="rounded border border-stone-300 bg-white px-2 py-0.5 font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50"
						title="Actualizá si cargaste/cambiaste tu inventario desde otra pantalla. Mantiene lo seleccionado."
					>
						{recargando ? 'Actualizando…' : '↻ Actualizar inventario'}
					</button>
				</div>
				<div class="flex items-center justify-between gap-2">
					<button
						type="button"
						onclick={prevStep}
						class="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50"
					>
						← {step === 1 ? 'Cambiar inicio' : 'Anterior'}
					</button>
					<div class="text-xs text-stone-500">Paso {step} de 3</div>
					<button
						type="button"
						onclick={nextStep}
						disabled={step === 3}
						class="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-30"
					>
						Siguiente →
					</button>
				</div>
			</div>
		</nav>
	{/if}
</div>
