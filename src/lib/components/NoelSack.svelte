<script lang="ts">
	/**
	 * Hotte de Noël façon « pâte à modeler » : sac rouge à pois, cordon torsadé,
	 * sucre d'orge qui dépasse. `progress` (0→1) suit le doigt pendant le
	 * glissement, `phase` pilote l'ouverture.
	 */
	let { progress = 0, phase = 'idle' }: { progress?: number; phase?: 'idle' | 'opening' | 'open' } =
		$props();
</script>

<svg
	class="sack"
	class:opening={phase === 'opening'}
	class:open={phase === 'open'}
	viewBox="0 0 320 340"
	style="--p:{progress}"
	aria-hidden="true"
>
	<defs>
		<radialGradient id="sack-body" cx="38%" cy="38%" r="70%">
			<stop offset="0" stop-color="#d5503a" />
			<stop offset="0.55" stop-color="#a52c1c" />
			<stop offset="1" stop-color="#5e170e" />
		</radialGradient>
		<radialGradient id="sack-top" cx="40%" cy="30%" r="80%">
			<stop offset="0" stop-color="#c54330" />
			<stop offset="1" stop-color="#6b1a10" />
		</radialGradient>
		<radialGradient id="dot" cx="35%" cy="30%" r="75%">
			<stop offset="0" stop-color="#ffe2b0" />
			<stop offset="1" stop-color="#d79a52" />
		</radialGradient>
		<linearGradient id="cane-shade" x1="0" x2="1">
			<stop offset="0" stop-color="#000" stop-opacity="0" />
			<stop offset="0.7" stop-color="#000" stop-opacity="0" />
			<stop offset="1" stop-color="#000" stop-opacity="0.28" />
		</linearGradient>
		<pattern id="stripes" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)">
			<rect width="22" height="22" fill="#fbf1e6" />
			<rect width="10" height="22" fill="#d63a28" />
		</pattern>
		<pattern id="rope" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(55)">
			<rect width="12" height="12" fill="#f0a24a" />
			<rect width="5" height="12" fill="#b4521e" />
		</pattern>
		<filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
			<feGaussianBlur stdDeviation="10" />
		</filter>
	</defs>

	<!-- ombre portée -->
	<ellipse class="shadow" cx="160" cy="318" rx="104" ry="14" fill="#000" opacity="0.35" filter="url(#soft)" />

	<g class="wobble">
		<!-- sucre d'orge -->
		<g class="cane">
			<path
				d="M150 190 V92 a34 34 0 0 1 68 0 v14"
				fill="none"
				stroke="url(#stripes)"
				stroke-width="26"
				stroke-linecap="round"
			/>
			<path
				d="M150 190 V92 a34 34 0 0 1 68 0 v14"
				fill="none"
				stroke="url(#cane-shade)"
				stroke-width="26"
				stroke-linecap="round"
			/>
			<path d="M142 104 V92 a42 42 0 0 1 16 -33" fill="none" stroke="#fff" stroke-opacity="0.55" stroke-width="5" stroke-linecap="round" />
		</g>

		<!-- corps du sac -->
		<path
			class="body"
			d="M118 168 C60 190 34 240 46 280 C58 318 110 330 160 330 C210 330 262 318 274 280 C286 240 260 190 202 168 Z"
			fill="url(#sack-body)"
		/>
		<!-- pois -->
		<g fill="url(#dot)">
			<circle cx="92" cy="244" r="15" />
			<circle cx="196" cy="226" r="12" />
			<circle cx="240" cy="280" r="17" />
			<circle cx="140" cy="300" r="13" />
			<circle cx="70" cy="296" r="8" />
			<circle cx="226" cy="188" r="7" />
		</g>
		<!-- reflet -->
		<path d="M78 222 C88 202 104 192 120 188" fill="none" stroke="#ffb59f" stroke-opacity="0.45" stroke-width="8" stroke-linecap="round" />

		<!-- col froncé -->
		<path
			class="ruffle"
			d="M96 150 C110 128 128 140 136 128 C146 116 154 134 166 124 C178 114 186 132 198 126 C212 120 222 140 230 146 C222 170 200 176 160 176 C120 176 100 170 96 150 Z"
			fill="url(#sack-top)"
		/>
		<path d="M104 150 C122 162 196 164 222 148" fill="none" stroke="#3d0d07" stroke-opacity="0.45" stroke-width="5" stroke-linecap="round" />

		<!-- cordon torsadé -->
		<g class="rope">
			<path d="M112 172 C140 182 180 182 208 172" fill="none" stroke="url(#rope)" stroke-width="14" stroke-linecap="round" />
			<path d="M150 178 C136 200 122 214 104 236" fill="none" stroke="url(#rope)" stroke-width="11" stroke-linecap="round" />
			<path d="M164 178 C170 204 186 220 196 246" fill="none" stroke="url(#rope)" stroke-width="11" stroke-linecap="round" />
			<circle cx="157" cy="178" r="12" fill="#e08a36" />
			<circle cx="153" cy="174" r="4" fill="#ffd18c" />
		</g>
	</g>
</svg>

<style>
	.sack {
		width: 100%;
		height: auto;
		overflow: visible;
	}
	.wobble {
		transform-origin: 160px 320px;
		transform: rotate(calc(sin(var(--p) * 18rad) * var(--p) * 7deg)) scale(calc(1 + var(--p) * 0.06));
		animation: breathe 3.6s ease-in-out infinite;
	}
	.shadow {
		transform-origin: 160px 318px;
		transform: scaleX(calc(1 + var(--p) * 0.1));
	}
	.cane {
		transform-origin: 160px 190px;
		transform: translateY(calc(var(--p) * -14px)) rotate(calc(var(--p) * 6deg));
		transition: transform 0.6s var(--ease-spring);
	}
	.opening .wobble {
		animation: shake 0.45s ease-in-out both;
	}
	.open .wobble {
		animation: none;
		transform: translateY(28px) scale(0.92);
		transition: transform 0.8s var(--ease-out);
	}
	.open .cane {
		transform: translateY(-46px) rotate(18deg);
		opacity: 0;
		transition:
			transform 0.6s var(--ease-out),
			opacity 0.4s 0.15s;
	}
	.open .rope {
		opacity: 0;
		transition: opacity 0.3s;
	}
	@keyframes breathe {
		50% {
			translate: 0 -4px;
		}
	}
	@keyframes shake {
		0%,
		100% {
			transform: rotate(0) scale(1.06);
		}
		20% {
			transform: rotate(-7deg) scale(1.1, 1.02);
		}
		40% {
			transform: rotate(6deg) scale(1.02, 1.1);
		}
		60% {
			transform: rotate(-4deg) scale(1.1, 0.98);
		}
		80% {
			transform: rotate(3deg) scale(1.04);
		}
	}
</style>
