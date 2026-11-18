<script lang="ts">
	/**
	 * Curseur « glisser vers la gauche ». La pastille part de la droite ;
	 * au-delà de 82 % de la course, le tirage est déclenché.
	 * Accessible au clavier : Entrée, Espace ou flèche gauche.
	 */
	let {
		progress = $bindable(0),
		label = 'Glisse vers la gauche',
		oncomplete
	}: { progress?: number; label?: string; oncomplete: () => void } = $props();

	const THRESHOLD = 0.82;
	const KNOB = 64;
	const PAD = 6;

	let track: HTMLDivElement;
	let dragging = $state(false);
	let done = $state(false);
	let startX = 0;
	let travel = 1;
	let lastTick = 0;

	function travelLength() {
		return Math.max(1, track.clientWidth - KNOB - PAD * 2);
	}

	function onpointerdown(e: PointerEvent) {
		if (done) return;
		dragging = true;
		startX = e.clientX;
		travel = travelLength();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function onpointermove(e: PointerEvent) {
		if (!dragging) return;
		const dx = startX - e.clientX; // vers la gauche = positif
		progress = Math.min(1, Math.max(0, dx / travel));
		// petit retour haptique à chaque palier
		const tick = Math.floor(progress * 4);
		if (tick > lastTick && 'vibrate' in navigator) navigator.vibrate?.(6);
		lastTick = tick;
	}

	function release() {
		if (!dragging) return;
		dragging = false;
		lastTick = 0;
		if (progress >= THRESHOLD) complete();
		else progress = 0;
	}

	function complete() {
		done = true;
		progress = 1;
		navigator.vibrate?.([12, 40, 24]);
		oncomplete();
	}

	function onkeydown(e: KeyboardEvent) {
		if (done) return;
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowLeft') {
			e.preventDefault();
			complete();
		}
	}
</script>

<div
	class="track"
	class:dragging
	class:done
	bind:this={track}
	style="--p:{progress};--knob:{KNOB}px;--pad:{PAD}px"
>
	<div class="fill"></div>
	<span class="label" aria-hidden="true">
		<span class="chev">‹‹‹</span>
		{label}
	</span>
	<button
		type="button"
		class="knob"
		aria-label="{label} (ou appuie sur Entrée)"
		{onpointerdown}
		{onpointermove}
		onpointerup={release}
		onpointercancel={release}
		{onkeydown}
	>
		<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
			{#if done}
				<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
			{:else}
				<path d="M14 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
				<path d="M19 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-opacity="0.35" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
			{/if}
		</svg>
	</button>
</div>

<style>
	.track {
		position: relative;
		height: calc(var(--knob) + var(--pad) * 2);
		border-radius: 999px;
		background: var(--track-bg, rgba(26, 18, 16, 0.42));
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
		overflow: hidden;
		user-select: none;
		-webkit-user-select: none;
		touch-action: none;
		transition:
			width 0.45s var(--ease-out),
			opacity 0.3s;
	}
	.fill {
		position: absolute;
		top: var(--pad);
		bottom: var(--pad);
		right: var(--pad);
		width: calc(var(--knob) + (100% - var(--knob) - var(--pad) * 2) * var(--p));
		border-radius: 999px;
		background: var(--track-fill, rgba(247, 227, 204, 0.16));
	}
	.label {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.6rem;
		padding-right: calc(var(--knob) + var(--pad));
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--cream);
		opacity: calc(1 - var(--p) * 1.6);
		pointer-events: none;
	}
	.chev {
		letter-spacing: -0.1em;
		font-size: 1.2rem;
		opacity: 0.6;
		animation: nudge 1.6s ease-in-out infinite;
	}
	.knob {
		position: absolute;
		top: var(--pad);
		right: var(--pad);
		width: var(--knob);
		height: var(--knob);
		display: grid;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: var(--cream-2);
		color: var(--knob-ink, var(--cocoa));
		box-shadow:
			0 10px 24px -8px rgba(0, 0, 0, 0.5),
			inset 0 -3px 0 rgba(0, 0, 0, 0.08);
		transform: translateX(calc((100cqw - var(--knob) - var(--pad) * 2) * var(--p) * -1));
		cursor: grab;
		touch-action: none;
		transition: transform 0.55s var(--ease-spring);
		animation: invite 2.4s 1s ease-in-out infinite;
	}
	.track {
		container-type: inline-size;
	}
	.dragging .knob {
		transition: none;
		cursor: grabbing;
		animation: none;
	}
	.done .knob {
		animation: none;
		background: var(--gold);
	}
	@keyframes nudge {
		50% {
			translate: -6px 0;
		}
	}
	@keyframes invite {
		0%,
		70%,
		100% {
			translate: 0 0;
		}
		78% {
			translate: -14px 0;
		}
		86% {
			translate: 0 0;
		}
		92% {
			translate: -6px 0;
		}
	}
</style>
