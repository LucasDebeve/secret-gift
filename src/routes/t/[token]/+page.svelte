<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { page } from '$app/state';
	import NoelSack from '$lib/components/NoelSack.svelte';
	import PartyBox from '$lib/components/PartyBox.svelte';
	import Sparkles from '$lib/components/Sparkles.svelte';
	import SwipeReveal from '$lib/components/SwipeReveal.svelte';
	import { burst } from '$lib/components/burst';
	import { formatBudget, formatEventDate } from '$lib/format';

	let { data } = $props();

	type Phase = 'idle' | 'opening' | 'open' | 'revealed';

	// svelte-ignore state_referenced_locally
	let target = $state<string | null>(data.status === 'active' ? data.target : null);
	// svelte-ignore state_referenced_locally
	let phase = $state<Phase>(target ? 'revealed' : 'idle');
	let replayed = $state(false);
	let progress = $state(0);
	let failed = $state(false);
	let swipeKey = $state(0);
	let canvas = $state<HTMLCanvasElement>();
	let scene = $state<HTMLDivElement>();

	const theme = $derived(data.draw.theme);
	const illusPhase = $derived(phase === 'idle' ? 'idle' : phase === 'opening' ? 'opening' : 'open');
	const budget = $derived(data.status === 'active' ? formatBudget(data.draw.budget) : null);
	const date = $derived(data.status === 'active' ? formatEventDate(data.draw.eventDate) : null);
	const letters = $derived(Array.from(target ?? ''));
	const nameSize = $derived(`clamp(2.4rem, ${Math.round(150 / Math.max(letters.length, 5))}vw, 4.75rem)`);

	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
	const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	onMount(() => {
		if (data.status === 'active') {
			fetch(`/t/${page.params.token}/seen`, { method: 'POST' }).catch(() => {});
		}
	});

	async function reveal() {
		failed = false;
		phase = 'opening';
		try {
			const request = target
				? Promise.resolve(target)
				: fetch(`/t/${page.params.token}/reveal`, { method: 'POST' }).then(async (r) => {
						if (!r.ok) throw new Error(String(r.status));
						return (await r.json()).target as string;
					});
			const [name] = await Promise.all([request, wait(reducedMotion() ? 0 : 520)]);
			target = name;
		} catch {
			failed = true;
			phase = 'idle';
			progress = 0;
			swipeKey++;
			return;
		}

		phase = 'open';
		if (!reducedMotion() && canvas && scene) {
			const s = scene.getBoundingClientRect();
			const c = canvas.getBoundingClientRect();
			burst(canvas, theme, { x: s.left - c.left + s.width / 2, y: s.top - c.top + s.height * 0.55 });
		}
		await wait(reducedMotion() ? 0 : 160);
		phase = 'revealed';
	}

	async function replay() {
		replayed = true;
		phase = 'idle';
		progress = 0;
		swipeKey++;
		await tick();
	}
</script>

<svelte:head>
	<title>{data.status === 'active' ? `${data.name}, ton tirage` : 'Tirage relancé'} · Secret Gift</title>
	<meta name="robots" content="noindex" />
	<meta property="og:title" content="{data.draw.title} · Secret Gift" />
	<meta property="og:description" content="Un tirage au sort t’attend. Ouvre le lien pour découvrir à qui tu offres un cadeau." />
	<meta name="theme-color" content={theme === 'noel' ? '#2b1d1a' : '#12141b'} />
</svelte:head>

{#if data.status === 'retired'}
	<main class="stage theme-{theme} retired">
		<div class="glow"></div>
		<div class="retired-card">
			<p class="eyebrow">{data.draw.title}</p>
			<h1>Ce lien a expiré.</h1>
			<p>
				Le tirage a été relancé. {data.draw.organizer ?? 'L’organisateur'} va t’envoyer un nouveau
				lien&nbsp;: c’est lui qui compte désormais.
			</p>
		</div>
	</main>
{:else}
	<main class="stage theme-{theme}" data-phase={phase} style="--p:{progress}">
		<div class="glow"></div>
		<div class="glow glow-reveal"></div>
		<canvas class="fx" bind:this={canvas} aria-hidden="true"></canvas>

		<header class="top">
			<span class="brand">Secret Gift</span>
			<span class="pill">{data.draw.title}</span>
		</header>

		<section class="intro" aria-hidden={phase === 'revealed'}>
			<h1>
				{data.name},<br />
				<em>ton tirage t’attend.</em>
			</h1>
			{#if budget || date}
				<p class="meta">
					{#if budget}Budget {budget}{/if}{#if budget && date}<span class="dot">·</span>{/if}{#if date}{date}{/if}
				</p>
			{/if}
		</section>

		{#if phase === 'revealed'}
			<p class="outro">C’est tiré, {data.name}.</p>
		{/if}

		<div class="scene" bind:this={scene}>
			<Sparkles {theme} {progress} burst={phase === 'open' || phase === 'revealed'} />
			<div class="illus">
				{#if theme === 'noel'}
					<NoelSack {progress} phase={illusPhase} />
				{:else}
					<PartyBox {progress} phase={illusPhase} />
				{/if}
			</div>

			{#if phase === 'revealed' && target}
				<article class="card" class:calm={!replayed && data.target !== null && progress === 0} aria-live="polite">
					<p class="card-kicker">Tu offres un cadeau à</p>
					<h2 class="name" style="font-size:{nameSize}" aria-label={target}>
						{#each letters as l, i (i)}
							<span style="--i:{i}" aria-hidden="true">{l === ' ' ? ' ' : l}</span>
						{/each}
					</h2>
					{#if budget || date}
						<div class="chips">
							{#if budget}<span class="chip">Jusqu’à {budget}</span>{/if}
							{#if date}<span class="chip">{date}</span>{/if}
						</div>
					{/if}
					<p class="secret">Chut… garde-le pour toi.</p>
				</article>
			{/if}
		</div>

		<footer class="bottom">
			{#if phase === 'revealed'}
				<button class="btn btn-ghost replay" onclick={replay}>
					<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
					Revoir l’animation
				</button>
			{:else}
				{#if failed}
					<p class="error" role="alert">Oups, la connexion a échoué. Réessaie.</p>
				{/if}
				{#key swipeKey}
					<SwipeReveal bind:progress label="Glisse pour découvrir" oncomplete={reveal} />
				{/key}
			{/if}
		</footer>
	</main>
{/if}

<style>
	.stage {
		--bg: #2b1d1a;
		--glow-a: #b8321f;
		--glow-b: #1f5c3b;
		--card: #f7e3cc;
		--card-ink: #2b1d1a;
		--accent: #c63a26;
		--star: #fff4e4;
		--glow: rgba(255, 214, 160, 0.85);

		position: relative;
		min-height: 100dvh;
		display: grid;
		grid-template-rows: auto auto 1fr auto;
		padding: max(16px, env(safe-area-inset-top)) 20px max(20px, env(safe-area-inset-bottom));
		background: var(--bg);
		overflow: hidden;
		max-width: 560px;
		margin: 0 auto;
	}
	.theme-soiree {
		--bg: #12141b;
		--glow-a: #3c4560;
		--glow-b: #7a3f2b;
		--card: #f3e7d3;
		--card-ink: #12141b;
		--accent: #b98d4d;
		--star: #f6dca6;
		--glow: rgba(246, 220, 166, 0.7);
	}
	@media (min-width: 561px) {
		.stage {
			min-height: min(100dvh, 920px);
			margin: max(0px, calc((100dvh - 920px) / 2)) auto;
			border-radius: var(--radius-xl);
		}
	}

	/* Halo d'ambiance : il s'intensifie quand on glisse, puis change de couleur */
	.glow {
		position: absolute;
		inset: -20%;
		background: radial-gradient(
			closest-side at 50% 58%,
			var(--glow-a) 0%,
			color-mix(in srgb, var(--glow-a) 40%, transparent) 55%,
			transparent 100%
		);
		opacity: calc(0.75 + var(--p) * 0.25);
		transform: scale(calc(1 + var(--p) * 0.15));
		transition:
			opacity 0.8s var(--ease-out),
			transform 0.6s var(--ease-out);
		pointer-events: none;
	}
	.glow-reveal {
		background: radial-gradient(
			closest-side at 50% 52%,
			var(--glow-b) 0%,
			color-mix(in srgb, var(--glow-b) 35%, transparent) 60%,
			transparent 100%
		);
		opacity: 0;
		transform: scale(0.6);
	}
	[data-phase='open'] .glow-reveal,
	[data-phase='revealed'] .glow-reveal {
		opacity: 1;
		transform: scale(1);
		transition:
			opacity 1s var(--ease-out),
			transform 1.2s var(--ease-out);
	}
	[data-phase='open'] .glow:not(.glow-reveal),
	[data-phase='revealed'] .glow:not(.glow-reveal) {
		opacity: 0;
	}

	.fx {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 5;
	}

	.top {
		position: relative;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		z-index: 2;
	}
	.brand {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.05rem;
		opacity: 0.8;
	}
	.pill {
		padding: 6px 14px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.08);
		font-size: 0.82rem;
		font-weight: 500;
		max-width: 60%;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.intro {
		position: relative;
		z-index: 2;
		margin-top: clamp(20px, 6vh, 56px);
		text-align: center;
		transition:
			opacity 0.5s var(--ease-out),
			transform 0.6s var(--ease-out);
	}
	.intro h1 {
		font-size: clamp(2.5rem, 11vw, 3.6rem);
	}
	.intro em {
		font-style: italic;
		font-variation-settings: 'SOFT' 100, 'WONK' 1;
		color: color-mix(in srgb, var(--cream) 78%, transparent);
	}
	.meta {
		margin-top: 14px;
		font-size: 0.95rem;
		color: color-mix(in srgb, var(--cream) 72%, transparent);
	}
	.meta::first-letter {
		text-transform: uppercase;
	}
	.dot {
		margin: 0 0.45em;
	}
	[data-phase='open'] .intro,
	[data-phase='revealed'] .intro {
		opacity: 0;
		transform: translateY(-24px);
		pointer-events: none;
	}

	.outro {
		position: absolute;
		top: calc(max(16px, env(safe-area-inset-top)) + 64px);
		left: 20px;
		right: 20px;
		z-index: 2;
		text-align: center;
		font-family: var(--font-display);
		font-style: italic;
		font-size: clamp(2rem, 9vw, 2.8rem);
		line-height: 1.05;
		animation: fade-up 0.7s 0.5s var(--ease-out) both;
	}
	.scene {
		position: relative;
		z-index: 1;
		display: grid;
		place-items: center;
		min-height: 300px;
	}
	.illus {
		width: min(78vw, 340px);
		transition:
			opacity 0.6s var(--ease-out),
			filter 0.6s;
	}
	[data-phase='revealed'] .illus {
		opacity: 0.18;
		filter: blur(6px);
	}

	.card {
		position: absolute;
		left: 0;
		right: 0;
		margin: 0 auto;
		width: min(100%, 420px);
		padding: 30px 26px 26px;
		border-radius: var(--radius-xl);
		background: var(--card);
		color: var(--card-ink);
		text-align: center;
		box-shadow:
			0 40px 80px -30px rgba(0, 0, 0, 0.7),
			inset 0 -6px 0 rgba(0, 0, 0, 0.06);
		animation: rise 0.95s var(--ease-spring) both;
	}
	.card.calm {
		animation: fade-up 0.6s var(--ease-out) both;
	}
	.card-kicker {
		font-size: 0.95rem;
		font-weight: 600;
		color: color-mix(in srgb, var(--card-ink) 60%, transparent);
	}
	.name {
		margin: 8px 0 18px;
		color: var(--accent);
		font-weight: 600;
		line-height: 1;
		overflow-wrap: anywhere;
	}
	.name span {
		display: inline-block;
		animation: letter 0.7s calc(0.35s + var(--i) * 0.05s) var(--ease-spring) both;
	}
	.calm .name span {
		animation: none;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
	}
	.chip {
		padding: 7px 14px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--card-ink) 8%, transparent);
		font-size: 0.88rem;
		font-weight: 600;
	}
	.chip::first-letter {
		text-transform: uppercase;
	}
	.secret {
		margin-top: 18px;
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.05rem;
		color: color-mix(in srgb, var(--card-ink) 65%, transparent);
	}

	.bottom {
		position: relative;
		z-index: 6;
		display: grid;
		gap: 10px;
		justify-items: center;
		padding-top: 12px;
	}
	.bottom :global(.track) {
		width: 100%;
	}
	.replay {
		animation: fade-up 0.5s 1.2s var(--ease-out) both;
	}
	.error {
		color: #ffd2c4;
		font-size: 0.9rem;
	}

	/* Lien expiré */
	.retired {
		grid-template-rows: 1fr;
		place-items: center;
	}
	.retired-card {
		position: relative;
		text-align: center;
		max-width: 360px;
		display: grid;
		gap: 14px;
	}
	.retired-card h1 {
		font-size: 2.6rem;
	}
	.eyebrow {
		font-size: 0.85rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.65;
	}

	@keyframes rise {
		0% {
			opacity: 0;
			transform: translateY(42%) scale(0.45) rotate(-8deg);
		}
		60% {
			opacity: 1;
		}
		100% {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes letter {
		from {
			opacity: 0;
			transform: translateY(0.55em) rotate(10deg) scale(0.6);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
	@keyframes fade-up {
		from {
			opacity: 0;
			transform: translateY(14px);
		}
		to {
			opacity: 1;
			transform: none;
		}
	}
</style>
