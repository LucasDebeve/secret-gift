<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { THEMES } from '$lib/themes';
	import { formatBudget, formatEventDate, timeAgo } from '$lib/format';

	let { data, form } = $props();

	type Person = (typeof data.participants)[number];

	let people = $state<Person[]>([]);
	let flashed = $state<Record<number, number>>({});
	let live = $state<'connecting' | 'on' | 'off'>('connecting');
	let now = $state(Date.now());
	let toast = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;
	let redrawDialog = $state<HTMLDialogElement>();
	let deleteDialog = $state<HTMLDialogElement>();
	let busy = $state(false);
	let showWelcome = $state(page.url.searchParams.has('nouveau'));
	let canShare = $state(false);

	$effect(() => {
		people = data.participants.map((p) => ({ ...p }));
	});

	const draw = $derived(data.draw);
	const revealed = $derived(people.filter((p) => p.revealed_at).length);
	const opened = $derived(people.filter((p) => p.opened_at && !p.revealed_at).length);
	const anySeen = $derived(people.some((p) => p.opened_at || p.revealed_at));
	const budget = $derived(formatBudget(draw.budget));
	const date = $derived(formatEventDate(draw.event_date));
	const origin = $derived(page.url.origin);
	const adminUrl = $derived(`${page.url.origin}${page.url.pathname}`);

	const linkFor = (p: Person) => `${origin}/t/${p.token}`;
	const messageFor = (p: Person) =>
		`Salut ${p.name} ! ${draw.organizer ? `${draw.organizer} t’a inscrit·e au` : 'Tu participes au'} tirage « ${draw.title} ». Ouvre ce lien pour découvrir à qui tu offres un cadeau (il est rien qu’à toi, ne le partage pas) :`;

	function notify(text: string) {
		toast = text;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (toast = ''), 2400);
	}

	async function copy(text: string, done: string) {
		try {
			await navigator.clipboard.writeText(text);
			notify(done);
		} catch {
			window.prompt('Copie ce texte :', text);
		}
	}

	async function share(p: Person) {
		const text = messageFor(p);
		const url = linkFor(p);
		if (canShare) {
			try {
				await navigator.share({ text, url });
				return;
			} catch (e) {
				if ((e as DOMException).name === 'AbortError') return;
			}
		}
		copy(`${text}\n${url}`, `Message pour ${p.name} copié`);
	}

	function copyAll() {
		const text = people.map((p) => `${p.name} : ${linkFor(p)}`).join('\n');
		copy(text, 'Tous les liens sont copiés');
	}

	function status(p: Person) {
		if (p.revealed_at) return { key: 'revealed', label: 'Découvert', when: timeAgo(p.revealed_at, now) };
		if (p.opened_at) return { key: 'opened', label: 'Lien ouvert', when: timeAgo(p.opened_at, now) };
		return { key: 'waiting', label: 'En attente', when: '' };
	}

	onMount(() => {
		canShare = typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
		const clock = setInterval(() => (now = Date.now()), 20_000);

		const source = new EventSource(`${page.url.pathname}/events`);
		source.onopen = () => (live = 'on');
		source.onerror = () => (live = source.readyState === EventSource.CLOSED ? 'off' : 'connecting');
		source.onmessage = (msg) => {
			const event = JSON.parse(msg.data);
			if (event.type === 'status') {
				const p = people.find((x) => x.id === event.participantId);
				if (p) {
					p.opened_at = event.openedAt;
					p.revealed_at = event.revealedAt;
					flashed[p.id] = Date.now();
					now = Date.now();
				}
			} else if (event.type === 'redrawn') {
				invalidate('app:draw');
			} else if (event.type === 'deleted') {
				goto('/');
			}
		};

		return () => {
			clearInterval(clock);
			source.close();
		};
	});

	const initials = (n: string) => Array.from(n.trim())[0]?.toLocaleUpperCase('fr') ?? '?';
	const hue = (n: string) => [...n].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
</script>

<svelte:head>
	<title>{draw.title} · Suivi · Secret Gift</title>
	<meta name="robots" content="noindex" />
	<meta name="theme-color" content="#1a1210" />
</svelte:head>

<div class="page theme-{draw.theme}">
	<header class="head">
		<a class="brand" href="/">Secret Gift</a>
		<span class="live live-{live}">
			<i></i>{live === 'on' ? 'En direct' : live === 'connecting' ? 'Connexion…' : 'Hors ligne'}
		</span>
	</header>

	<section class="title">
		<p class="eyebrow">{THEMES[draw.theme].label}{draw.round > 1 ? ` · tirage n°${draw.round}` : ''}</p>
		<h1>{draw.title}</h1>
		<div class="chips">
			<span class="chip">{people.length} participants</span>
			{#if budget}<span class="chip">Budget {budget}</span>{/if}
			{#if date}<span class="chip cap">{date}</span>{/if}
		</div>
	</section>

	{#if showWelcome}
		<aside class="welcome">
			<div>
				<h2>Le tirage est fait.</h2>
				<p>
					Garde bien <strong>cette page en favori</strong> : son adresse est ta seule clé pour revenir ici.
					Personne, pas même toi, ne peut voir qui a tiré qui.
				</p>
			</div>
			<div class="welcome-actions">
				<button class="btn btn-cream" onclick={() => copy(adminUrl, 'Lien d’administration copié')}>Copier mon lien privé</button>
				<button class="btn btn-ghost" onclick={() => (showWelcome = false)}>C’est noté</button>
			</div>
		</aside>
	{/if}

	<section class="progress" aria-live="polite">
		<div class="progress-text">
			<p class="big"><strong>{revealed}</strong><span>/{people.length}</span></p>
			<p>ont découvert leur tirage{#if opened}<br /><small>{opened} {opened > 1 ? 'ont' : 'a'} ouvert le lien sans glisser</small>{/if}</p>
		</div>
		<div class="bar" role="presentation">
			<div class="bar-opened" style="width:{((revealed + opened) / people.length) * 100}%"></div>
			<div class="bar-revealed" style="width:{(revealed / people.length) * 100}%"></div>
		</div>
	</section>

	<section class="list">
		<div class="list-head">
			<h2>Les invitations</h2>
			<button class="btn btn-ghost small" onclick={copyAll}>Copier tous les liens</button>
		</div>
		<p class="hint">Envoie à chacun <em>son</em> lien. Il est personnel : celui qui l’ouvre découvre le tirage de cette personne.</p>

		<ul>
			{#each people as p (p.id)}
				{@const s = status(p)}
				<li class="row" data-status={s.key}>
					{#key flashed[p.id]}<span class="flash" class:on={!!flashed[p.id]}></span>{/key}
					<span class="avatar" style="--h:{hue(p.name)}">{initials(p.name)}</span>
					<div class="who">
						<strong>{p.name}</strong>
						<span class="state"><i></i>{s.label}{#if s.when}<span class="when"> · {s.when}</span>{/if}</span>
					</div>
					<div class="actions">
						<button class="icon" onclick={() => copy(linkFor(p), `Lien de ${p.name} copié`)} aria-label="Copier le lien de {p.name}" title="Copier le lien">
							<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2" /></svg>
						</button>
						<button class="btn btn-cream send" onclick={() => share(p)}>
							<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12l16-8-6 16-2.5-6.5L4 12z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" /></svg>
							Envoyer
						</button>
					</div>
				</li>
			{/each}
		</ul>

		{#if data.exclusions.length}
			<p class="exclusions">
				Exclusions : {#each data.exclusions as ex, i (i)}<span>{ex.a} ⇄ {ex.b}</span>{/each}
			</p>
		{/if}
	</section>

	<section class="manage">
		<div class="card">
			<h3>Une erreur dans le tirage ?</h3>
			<p>Relancer refait le tirage avec les mêmes personnes. Tous les liens changent : il faudra renvoyer les nouveaux.</p>
			<button class="btn btn-primary" onclick={() => redrawDialog?.showModal()}>Relancer le tirage</button>
		</div>
		<div class="card">
			<h3>Ton lien privé</h3>
			<p>La seule façon de revenir sur cette page. Ne l’envoie pas aux participants.</p>
			<button class="btn btn-ghost" onclick={() => copy(adminUrl, 'Lien d’administration copié')}>Copier le lien d’administration</button>
			<button class="link danger" onclick={() => deleteDialog?.showModal()}>Supprimer ce tirage</button>
		</div>
	</section>
</div>

<dialog bind:this={redrawDialog} class="dialog" onclick={(e) => e.target === redrawDialog && redrawDialog?.close()}>
	<form
		method="POST"
		action="?/redraw"
		use:enhance={() => {
			busy = true;
			return async ({ update, result }) => {
				await update();
				busy = false;
				redrawDialog?.close();
				if (result.type === 'success') notify('Nouveau tirage effectué. Renvoie les nouveaux liens !');
			};
		}}
	>
		<h2>Relancer le tirage&nbsp;?</h2>
		{#if anySeen}
			<p class="alert">
				<strong>{revealed + opened} personne{revealed + opened > 1 ? 's ont' : ' a'} déjà ouvert son lien.</strong>
				Leur ancien tirage ne sera plus valable : préviens-les.
			</p>
		{/if}
		<p>Tous les liens actuels vont expirer. Tu devras envoyer les nouveaux liens à <strong>tout le monde</strong>.</p>
		<div class="dialog-actions">
			<button type="button" class="btn btn-ghost" onclick={() => redrawDialog?.close()}>Annuler</button>
			<button class="btn btn-primary" disabled={busy}>{busy ? 'Tirage…' : 'Oui, relancer'}</button>
		</div>
	</form>
</dialog>

<dialog bind:this={deleteDialog} class="dialog" onclick={(e) => e.target === deleteDialog && deleteDialog?.close()}>
	<form method="POST" action="?/delete">
		<h2>Supprimer ce tirage&nbsp;?</h2>
		<p>Les liens des participants ne fonctionneront plus. C’est définitif.</p>
		<div class="dialog-actions">
			<button type="button" class="btn btn-ghost" onclick={() => deleteDialog?.close()}>Annuler</button>
			<button class="btn btn-primary">Supprimer</button>
		</div>
	</form>
</dialog>

{#if form?.message}
	<p class="toast error" role="alert">{form.message}</p>
{:else if toast}
	<p class="toast" role="status">{toast}</p>
{/if}

<style>
	.page {
		--accent: var(--red);
		--glow: rgba(198, 58, 38, 0.3);
		max-width: 760px;
		margin: 0 auto;
		padding: max(20px, env(safe-area-inset-top)) 16px 64px;
		display: grid;
		gap: 28px;
		background: radial-gradient(520px 360px at 50% -80px, var(--glow), transparent 70%);
	}
	.theme-soiree {
		--accent: #c79a58;
		--glow: rgba(60, 69, 96, 0.55);
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.brand {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.1rem;
		color: var(--sand);
		text-decoration: none;
	}
	.live {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--muted);
	}
	.live i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--muted);
	}
	.live-on i {
		background: #5fd08a;
		box-shadow: 0 0 0 0 rgba(95, 208, 138, 0.6);
		animation: pulse 2s infinite;
	}
	.live-off i {
		background: var(--red-hot);
	}

	.eyebrow {
		font-size: 0.8rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.title h1 {
		margin-top: 8px;
		font-size: clamp(2.2rem, 8vw, 3.4rem);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}
	.chip {
		padding: 6px 12px;
		border-radius: 999px;
		background: rgba(247, 227, 204, 0.08);
		font-size: 0.85rem;
		font-weight: 500;
	}
	.cap::first-letter {
		text-transform: uppercase;
	}

	.welcome {
		display: grid;
		gap: 16px;
		padding: 22px;
		border-radius: var(--radius-l);
		background: var(--green);
		animation: drop 0.6s var(--ease-spring);
	}
	.welcome h2 {
		font-size: 1.6rem;
	}
	.welcome p {
		margin-top: 6px;
		color: color-mix(in srgb, var(--cream) 85%, transparent);
	}
	.welcome-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.progress {
		display: grid;
		gap: 14px;
		padding: 22px;
		border-radius: var(--radius-l);
		background: var(--cocoa);
	}
	.progress-text {
		display: flex;
		align-items: center;
		gap: 16px;
	}
	.big {
		font-family: var(--font-display);
		font-size: 3.2rem;
		line-height: 1;
	}
	.big span {
		font-size: 1.6rem;
		color: var(--muted);
	}
	.progress-text small {
		color: var(--muted);
	}
	.bar {
		position: relative;
		height: 10px;
		border-radius: 999px;
		background: rgba(247, 227, 204, 0.08);
		overflow: hidden;
	}
	.bar > div {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: inherit;
		transition: width 0.8s var(--ease-spring);
	}
	.bar-opened {
		background: color-mix(in srgb, var(--gold) 40%, transparent);
	}
	.bar-revealed {
		background: var(--gold);
	}

	.list-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.list h2 {
		font-size: 1.7rem;
	}
	.small {
		min-height: 38px;
		padding: 0 14px;
		font-size: 0.85rem;
	}
	.hint {
		margin-top: 6px;
		font-size: 0.9rem;
		color: var(--muted);
	}
	.list ul {
		list-style: none;
		margin: 16px 0 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	.row {
		position: relative;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 12px;
		padding: 10px 10px 10px 12px;
		border-radius: var(--radius-m);
		background: var(--cocoa);
		overflow: hidden;
	}
	.flash {
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: 0;
	}
	.flash.on {
		animation: flash 1.6s var(--ease-out);
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		border-radius: 14px;
		background: hsl(var(--h) 45% 32%);
		color: hsl(var(--h) 70% 88%);
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 600;
	}
	.who {
		display: grid;
		min-width: 0;
	}
	.who strong {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.state {
		display: flex;
		white-space: nowrap;
		align-items: center;
		gap: 6px;
		font-size: 0.82rem;
		color: var(--muted);
	}
	.state i {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		border: 1.5px solid var(--muted);
	}
	[data-status='opened'] .state {
		color: color-mix(in srgb, var(--gold) 75%, var(--cream));
	}
	[data-status='opened'] .state i {
		border-color: var(--gold);
		background: color-mix(in srgb, var(--gold) 40%, transparent);
	}
	[data-status='revealed'] .state {
		color: #8fe0aa;
	}
	[data-status='revealed'] .state i {
		border-color: #5fd08a;
		background: #5fd08a;
	}
	.when {
		opacity: 0.75;
	}
	@media (max-width: 360px) {
		.when {
			display: none;
		}
	}
	.actions {
		display: flex;
		gap: 6px;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: 50%;
		background: rgba(247, 227, 204, 0.08);
	}
	.icon:hover {
		background: rgba(247, 227, 204, 0.16);
	}
	.send {
		min-height: 44px;
		padding: 0 16px;
	}
	@media (max-width: 380px) {
		.send {
			width: 44px;
			padding: 0;
			font-size: 0;
			gap: 0;
		}
	}
	.exclusions {
		margin-top: 14px;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.exclusions span {
		margin-left: 8px;
		white-space: nowrap;
	}

	.manage {
		display: grid;
		gap: 12px;
	}
	@media (min-width: 640px) {
		.manage {
			grid-template-columns: 1fr 1fr;
		}
	}
	.card {
		display: grid;
		gap: 10px;
		align-content: start;
		justify-items: start;
		padding: 22px;
		border-radius: var(--radius-l);
		border: 1px solid rgba(247, 227, 204, 0.1);
	}
	.card h3 {
		font-size: 1.3rem;
	}
	.card p {
		font-size: 0.9rem;
		color: var(--muted);
		margin-bottom: 6px;
	}
	.link {
		border: 0;
		background: none;
		padding: 4px 0;
		font-size: 0.88rem;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.danger {
		color: #f29a86;
	}

	.dialog {
		width: min(92vw, 440px);
		padding: 26px;
		border: 0;
		border-radius: var(--radius-xl);
		background: var(--cream);
		color: var(--cocoa);
	}
	.dialog::backdrop {
		background: rgba(10, 6, 5, 0.6);
		backdrop-filter: blur(4px);
	}
	.dialog[open] {
		animation: drop 0.4s var(--ease-spring);
	}
	.dialog form {
		display: grid;
		gap: 12px;
	}
	.dialog h2 {
		font-size: 1.8rem;
	}
	.alert {
		padding: 12px 14px;
		border-radius: var(--radius-m);
		background: #f6d2c6;
		color: var(--red-deep);
	}
	.dialog-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 8px;
	}
	.dialog .btn-ghost {
		background: rgba(43, 29, 26, 0.08);
		color: var(--cocoa);
	}

	.toast {
		position: fixed;
		left: 50%;
		bottom: max(20px, env(safe-area-inset-bottom));
		translate: -50% 0;
		z-index: 50;
		max-width: calc(100vw - 32px);
		padding: 12px 18px;
		border-radius: 999px;
		background: var(--cream);
		color: var(--cocoa);
		font-weight: 600;
		box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.6);
		animation: drop 0.4s var(--ease-spring);
	}
	.toast.error {
		background: #f6d2c6;
		color: var(--red-deep);
	}

	@keyframes pulse {
		70% {
			box-shadow: 0 0 0 8px rgba(95, 208, 138, 0);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(95, 208, 138, 0);
		}
	}
	@keyframes flash {
		0% {
			opacity: 1;
			background: rgba(242, 184, 75, 0.35);
		}
		100% {
			opacity: 0;
			background: rgba(242, 184, 75, 0);
		}
	}
	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-10px) scale(0.98);
		}
	}
</style>
