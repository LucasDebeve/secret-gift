<script lang="ts">
	/** Coffret « soirée » : boîte encre, ruban champagne, couvercle qui saute. */
	let { progress = 0, phase = 'idle' }: { progress?: number; phase?: 'idle' | 'opening' | 'open' } =
		$props();
</script>

<svg
	class="box"
	class:opening={phase === 'opening'}
	class:open={phase === 'open'}
	viewBox="0 0 320 340"
	style="--p:{progress}"
	aria-hidden="true"
>
	<defs>
		<linearGradient id="box-front" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#3b4256" />
			<stop offset="1" stop-color="#1b1f2b" />
		</linearGradient>
		<linearGradient id="box-side" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#232837" />
			<stop offset="1" stop-color="#151821" />
		</linearGradient>
		<linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#4a5269" />
			<stop offset="1" stop-color="#2a3040" />
		</linearGradient>
		<linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="0">
			<stop offset="0" stop-color="#b98d4d" />
			<stop offset="0.45" stop-color="#f6dca6" />
			<stop offset="1" stop-color="#c79a58" />
		</linearGradient>
		<radialGradient id="bow" cx="35%" cy="30%" r="80%">
			<stop offset="0" stop-color="#fbe7bd" />
			<stop offset="1" stop-color="#b8894a" />
		</radialGradient>
		<filter id="box-soft" x="-20%" y="-20%" width="140%" height="140%">
			<feGaussianBlur stdDeviation="10" />
		</filter>
	</defs>

	<ellipse cx="160" cy="318" rx="110" ry="13" fill="#000" opacity="0.4" filter="url(#box-soft)" />

	<g class="wobble">
		<!-- boîte -->
		<g class="base">
			<path d="M58 180 H262 V300 Q262 314 248 314 H72 Q58 314 58 300 Z" fill="url(#box-front)" />
			<path d="M226 180 H262 V300 Q262 314 248 314 H226 Z" fill="url(#box-side)" opacity="0.8" />
			<rect x="146" y="180" width="28" height="134" fill="url(#ribbon)" />
			<path d="M70 196 V292" stroke="#fff" stroke-opacity="0.12" stroke-width="6" stroke-linecap="round" />
		</g>

		<!-- couvercle -->
		<g class="lid">
			<rect x="44" y="146" width="232" height="44" rx="12" fill="url(#lid)" />
			<rect x="44" y="180" width="232" height="10" rx="5" fill="#000" opacity="0.18" />
			<rect x="142" y="146" width="36" height="44" fill="url(#ribbon)" />
			<path d="M60 156 H128" stroke="#fff" stroke-opacity="0.18" stroke-width="5" stroke-linecap="round" />
			<!-- nœud -->
			<path d="M160 148 C130 102 84 112 98 136 C108 152 140 152 160 148 Z" fill="url(#bow)" />
			<path d="M160 148 C190 102 236 112 222 136 C212 152 180 152 160 148 Z" fill="url(#bow)" />
			<path d="M118 132 C130 128 146 136 156 146" fill="none" stroke="#8a6331" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round" />
			<path d="M202 132 C190 128 174 136 164 146" fill="none" stroke="#8a6331" stroke-opacity="0.5" stroke-width="4" stroke-linecap="round" />
			<ellipse cx="160" cy="146" rx="16" ry="13" fill="url(#bow)" />
		</g>
	</g>
</svg>

<style>
	.box {
		width: 100%;
		height: auto;
		overflow: visible;
	}
	.wobble {
		transform-origin: 160px 314px;
		transform: rotate(calc(sin(var(--p) * 18rad) * var(--p) * 5deg)) scale(calc(1 + var(--p) * 0.05));
		animation: float 4s ease-in-out infinite;
	}
	.lid {
		transform-origin: 160px 190px;
		transform: translateY(calc(var(--p) * -12px)) rotate(calc(var(--p) * -3deg));
	}
	.opening .wobble {
		animation: shake 0.45s ease-in-out both;
	}
	.open .wobble {
		animation: none;
		transform: translateY(30px) scale(0.92);
		transition: transform 0.8s var(--ease-out);
	}
	.open .lid {
		transform: translate(-90px, -150px) rotate(-38deg);
		opacity: 0;
		transition:
			transform 0.7s var(--ease-out),
			opacity 0.5s 0.25s;
	}
	@keyframes float {
		50% {
			translate: 0 -5px;
		}
	}
	@keyframes shake {
		0%,
		100% {
			transform: rotate(0) scale(1.05);
		}
		25% {
			transform: rotate(-5deg) scale(1.08, 1.02);
		}
		50% {
			transform: rotate(4deg) scale(1.02, 1.08);
		}
		75% {
			transform: rotate(-3deg) scale(1.06, 0.99);
		}
	}
</style>
