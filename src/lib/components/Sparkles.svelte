<script lang="ts">
	/** Étoiles flottantes autour de l'illustration ; elles s'écartent et brillent avec `progress`. */
	let {
		theme,
		progress = 0,
		burst = false
	}: { theme: 'noel' | 'soiree'; progress?: number; burst?: boolean } = $props();

	// position (en % du conteneur), taille, direction d'écartement, délai
	const stars = [
		{ x: 12, y: 30, s: 64, dx: -1, dy: -0.4, d: 0 },
		{ x: 84, y: 22, s: 34, dx: 1, dy: -0.8, d: 0.6 },
		{ x: 88, y: 58, s: 44, dx: 1.2, dy: 0.2, d: 1.1 },
		{ x: 6, y: 68, s: 28, dx: -1.2, dy: 0.5, d: 1.6 },
		{ x: 70, y: 6, s: 22, dx: 0.4, dy: -1, d: 2.1 }
	];

	const star =
		'M50 6 C54 6 56 10 58 16 L64 33 L82 34 C92 35 95 40 88 46 L74 58 L79 76 C82 86 77 90 69 84 L50 72 L31 84 C23 90 18 86 21 76 L26 58 L12 46 C5 40 8 35 18 34 L36 33 L42 16 C44 10 46 6 50 6 Z';
	const sparkle = 'M50 0 C53 34 66 47 100 50 C66 53 53 66 50 100 C47 66 34 53 0 50 C34 47 47 34 50 0 Z';
</script>

<div class="sparkles" class:burst style="--p:{progress}" aria-hidden="true">
	{#each stars as st, i (i)}
		<svg
			class="star"
			viewBox="0 0 100 100"
			style="left:{st.x}%;top:{st.y}%;width:{st.s}px;--dx:{st.dx};--dy:{st.dy};--d:{st.d}s"
		>
			<path d={theme === 'noel' ? star : sparkle} />
		</svg>
	{/each}
</div>

<style>
	.sparkles {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.star {
		position: absolute;
		translate: -50% -50%;
		overflow: visible;
		fill: var(--star, #fff4e4);
		filter: drop-shadow(0 0 calc(10px + var(--p) * 22px) var(--glow, rgba(255, 214, 160, 0.85)));
		transform: translate(calc(var(--dx) * var(--p) * 26px), calc(var(--dy) * var(--p) * 26px))
			scale(calc(1 + var(--p) * 0.35));
		animation: twinkle 3.2s var(--d) ease-in-out infinite;
		transition: transform 0.5s var(--ease-spring);
	}
	.burst .star {
		transform: translate(calc(var(--dx) * 180px), calc(var(--dy) * 180px)) scale(0.2) rotate(120deg);
		opacity: 0;
		transition:
			transform 0.9s var(--ease-out),
			opacity 0.6s 0.2s;
	}
	@keyframes twinkle {
		0%,
		100% {
			rotate: -6deg;
			opacity: 1;
		}
		50% {
			rotate: 8deg;
			opacity: 0.75;
		}
	}
</style>
