<script lang="ts">
	import { enhance } from '$app/forms';
	import NoelSack from '$lib/components/NoelSack.svelte';
	import PartyBox from '$lib/components/PartyBox.svelte';
	import { THEMES, type ThemeId } from '$lib/themes';

	let { form } = $props();

	// svelte-ignore state_referenced_locally
	const initial = form;
	let title = $state(initial?.title ?? '');
	let organizer = $state(initial?.organizer ?? '');
	let theme = $state<ThemeId>((initial?.theme as ThemeId) ?? 'noel');
	let budget = $state(initial?.budget ?? '');
	let eventDate = $state(initial?.eventDate ?? '');
	let names = $state<string[]>(initial?.names ?? []);
	let exclusions = $state<Array<[string, string]>>(initial?.exclusions ?? []);

	let draft = $state('');
	let nameError = $state('');
	let exA = $state('');
	let exB = $state('');
	let submitting = $state(false);
	let nameInput: HTMLInputElement;

	const key = (n: string) => n.toLocaleLowerCase('fr');
	const has = (n: string) => names.some((x) => key(x) === key(n));
	const canAddMe = $derived(organizer.trim().length > 0 && !has(organizer.trim()));
	const enough = $derived(names.length >= 3);

	function addNames(raw: string) {
		const incoming = raw
			.split(/[\n,;]+/)
			.map((s) => s.replace(/\s+/g, ' ').trim())
			.filter(Boolean);
		const skipped: string[] = [];
		for (const n of incoming) {
			if (n.length > 40) skipped.push(n.slice(0, 12) + '…');
			else if (has(n)) skipped.push(n);
			else names.push(n);
		}
		nameError = skipped.length ? `Déjà dans la liste ou trop long : ${skipped.join(', ')}` : '';
	}

	function submitName(e?: Event) {
		e?.preventDefault();
		if (!draft.trim()) return;
		addNames(draft);
		draft = '';
		nameInput?.focus();
	}

	function onpaste(e: ClipboardEvent) {
		const text = e.clipboardData?.getData('text') ?? '';
		if (/[\n,;]/.test(text)) {
			e.preventDefault();
			addNames(text);
		}
	}

	function removeName(n: string) {
		names = names.filter((x) => x !== n);
		exclusions = exclusions.filter(([a, b]) => a !== n && b !== n);
	}

	function addExclusion() {
		if (!exA || !exB || exA === exB) return;
		const exists = exclusions.some(
			([a, b]) => (a === exA && b === exB) || (a === exB && b === exA)
		);
		if (!exists) exclusions.push([exA, exB]);
		exA = exB = '';
	}
</script>

<svelte:head>
	<title>Secret Gift · Organise ton tirage au sort</title>
	<meta name="description" content="Crée un tirage au sort secret (Secret Santa…) et envoie à chacun son lien personnel." />
	<meta name="theme-color" content="#1a1210" />
</svelte:head>

<div class="page">
	<section class="hero">
		<p class="brand">Secret Gift</p>
		<h1>Chacun tire quelqu’un. <em>Personne ne sait qui.</em></h1>
		<p class="lede">
			Ajoute les participants, envoie à chacun son lien par SMS. Ils glissent le doigt, découvrent leur
			personne, et tu vois en direct qui a ouvert le sien.
		</p>
		<ol class="steps">
			<li><span>1</span>Tu crées le tirage</li>
			<li><span>2</span>Tu envoies les liens</li>
			<li><span>3</span>Chacun découvre le sien</li>
		</ol>
	</section>

	<form
		class="panel"
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update({ reset: false });
				submitting = false;
			};
		}}
	>
		<fieldset>
			<legend><span class="num">01</span>L’événement</legend>

			<label class="field">
				<span>Nom du tirage</span>
				<input name="title" bind:value={title} required maxlength="80" placeholder="Noël chez Mamie" autocomplete="off" />
			</label>

			<label class="field">
				<span>Ton prénom <small>facultatif, affiché aux participants</small></span>
				<input name="organizer" bind:value={organizer} maxlength="40" placeholder="Lucie" autocomplete="given-name" />
			</label>

			<div class="field">
				<span id="theme-label">Ambiance</span>
				<div class="themes" role="radiogroup" aria-labelledby="theme-label">
					{#each Object.values(THEMES) as t (t.id)}
						<label class="theme theme-{t.id}" class:selected={theme === t.id}>
							<input type="radio" name="theme" value={t.id} bind:group={theme} class="visually-hidden" />
							<div class="theme-art">
								{#if t.id === 'noel'}<NoelSack />{:else}<PartyBox />{/if}
							</div>
							<strong>{t.label}</strong>
							<small>{t.tagline}</small>
						</label>
					{/each}
				</div>
			</div>
		</fieldset>

		<fieldset>
			<legend><span class="num">02</span>Les participants</legend>

			<div class="add-row">
				<label class="field grow">
					<span class="visually-hidden">Prénom d’un participant</span>
					<input
						bind:this={nameInput}
						bind:value={draft}
						{onpaste}
						onkeydown={(e) => e.key === 'Enter' && submitName(e)}
						maxlength="400"
						placeholder="Prénom, puis Entrée"
						autocomplete="off"
						enterkeyhint="done"
					/>
				</label>
				<button type="button" class="btn btn-dark" onclick={submitName} disabled={!draft.trim()}>Ajouter</button>
			</div>
			<p class="hint">
				Astuce&nbsp;: colle une liste séparée par des virgules ou des retours à la ligne.
				{#if canAddMe}
					<button type="button" class="link" onclick={() => addNames(organizer)}>M’ajouter ({organizer.trim()})</button>
				{/if}
			</p>
			{#if nameError}<p class="warn">{nameError}</p>{/if}

			{#if names.length}
				<ul class="people">
					{#each names as n (n)}
						<li>
							<input type="hidden" name="participant" value={n} />
							<span>{n}</span>
							<button type="button" aria-label="Retirer {n}" onclick={() => removeName(n)}>
								<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			<p class="count" class:ok={enough}>
				{names.length} participant{names.length > 1 ? 's' : ''}{#if !enough}&nbsp;· il en faut au moins 3{/if}
			</p>
		</fieldset>

		<fieldset>
			<legend><span class="num">03</span>Les détails <small>facultatif</small></legend>

			<div class="two">
				<label class="field">
					<span>Budget</span>
					<div class="suffix">
						<input name="budget" bind:value={budget} inputmode="numeric" pattern="[0-9]+([,.][0-9]+)?" placeholder="30" />
						<span>€</span>
					</div>
				</label>
				<label class="field">
					<span>Date de l’échange</span>
					<input name="eventDate" type="date" bind:value={eventDate} />
				</label>
			</div>

			<div class="field">
				<span>Exclusions <small>ces deux personnes ne se tireront pas</small></span>
				{#if names.length >= 3}
					<div class="ex-row">
						<select bind:value={exA} aria-label="Première personne">
							<option value="">Choisir…</option>
							{#each names as n (n)}<option value={n} disabled={n === exB}>{n}</option>{/each}
						</select>
						<span class="ex-sep" aria-hidden="true">⇄</span>
						<select bind:value={exB} aria-label="Seconde personne">
							<option value="">Choisir…</option>
							{#each names as n (n)}<option value={n} disabled={n === exA}>{n}</option>{/each}
						</select>
						<button type="button" class="btn btn-dark" onclick={addExclusion} disabled={!exA || !exB}>Ajouter</button>
					</div>
				{:else}
					<p class="hint">Ajoute d’abord tes participants. Pratique pour les couples.</p>
				{/if}
				{#if exclusions.length}
					<ul class="pairs">
						{#each exclusions as [a, b], i (a + '|' + b)}
							<li>
								<span>{a} <span aria-label="et">⇄</span> {b}</span>
								<button type="button" aria-label="Supprimer l’exclusion {a} et {b}" onclick={() => exclusions.splice(i, 1)}>
									<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" /></svg>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				<input type="hidden" name="exclusions" value={JSON.stringify(exclusions)} />
			</div>
		</fieldset>

		{#if form?.message}
			<p class="form-error" role="alert">{form.message}</p>
		{/if}

		<button class="btn btn-primary submit" disabled={!enough || !title.trim() || submitting}>
			{submitting ? 'Tirage en cours…' : 'Lancer le tirage'}
		</button>
		<p class="fine">Tu obtiendras un lien privé pour suivre le tirage et envoyer les invitations.</p>
	</form>
</div>

<style>
	.page {
		min-height: 100dvh;
		display: grid;
		gap: 32px;
		padding: max(24px, env(safe-area-inset-top)) 16px 48px;
		max-width: 1140px;
		margin: 0 auto;
		background:
			radial-gradient(600px 420px at 0% 0%, rgba(198, 58, 38, 0.28), transparent 70%),
			radial-gradient(500px 400px at 100% 30%, rgba(31, 92, 59, 0.22), transparent 70%);
	}
	@media (min-width: 900px) {
		.page {
			grid-template-columns: 1fr 1.05fr;
			gap: 64px;
			padding: 64px 32px;
			align-items: start;
		}
		.hero {
			position: sticky;
			top: 64px;
		}
	}

	.brand {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.15rem;
		color: var(--sand);
	}
	.hero h1 {
		margin-top: 20px;
		font-size: clamp(2.6rem, 7vw, 4.4rem);
	}
	.hero em {
		display: block;
		font-style: italic;
		font-variation-settings: 'SOFT' 100, 'WONK' 1;
		color: var(--sand);
	}
	.lede {
		margin-top: 20px;
		max-width: 46ch;
		font-size: 1.05rem;
		color: color-mix(in srgb, var(--cream) 78%, transparent);
	}
	.steps {
		list-style: none;
		padding: 0;
		margin: 28px 0 0;
		display: grid;
		gap: 10px;
		font-weight: 500;
	}
	.steps li {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.steps span {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: rgba(247, 227, 204, 0.1);
		font-family: var(--font-display);
		font-size: 0.95rem;
	}

	.panel {
		--line: rgba(43, 29, 26, 0.12);
		background: var(--cream);
		color: var(--cocoa);
		border-radius: var(--radius-xl);
		padding: 8px 20px 24px;
		box-shadow: 0 40px 100px -40px rgba(0, 0, 0, 0.8);
	}
	@media (min-width: 600px) {
		.panel {
			padding: 12px 36px 32px;
		}
	}
	fieldset {
		border: 0;
		margin: 0;
		padding: 24px 0;
		display: grid;
		gap: 16px;
		border-bottom: 1px solid var(--line);
		min-width: 0;
	}
	legend {
		float: left;
		width: 100%;
		display: flex;
		align-items: baseline;
		gap: 12px;
		margin-bottom: 4px;
		font-family: var(--font-display);
		font-size: 1.6rem;
		font-weight: 500;
	}
	legend small {
		font-family: var(--font-body);
		font-size: 0.85rem;
		color: #8a6f62;
	}
	.num {
		font-family: var(--font-body);
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--red);
		letter-spacing: 0.05em;
	}

	.field {
		display: grid;
		gap: 6px;
		min-width: 0;
	}
	.field > span {
		font-weight: 600;
		font-size: 0.92rem;
	}
	.field small {
		font-weight: 400;
		color: #8a6f62;
	}
	input:not([type='radio']),
	select {
		width: 100%;
		min-height: 50px;
		padding: 0 16px;
		border: 2px solid transparent;
		border-radius: var(--radius-m);
		background: var(--cream-2);
		color: var(--cocoa);
		font-size: 1rem;
		box-shadow: inset 0 0 0 1px var(--line);
		transition:
			border-color 0.15s,
			background-color 0.15s;
	}
	input::placeholder {
		color: #b29a8c;
	}
	input:focus,
	select:focus {
		outline: none;
		border-color: var(--red);
		background: #fff;
	}
	.suffix {
		position: relative;
	}
	.suffix span {
		position: absolute;
		right: 16px;
		top: 50%;
		translate: 0 -50%;
		color: #8a6f62;
		font-weight: 600;
	}

	.themes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.theme {
		position: relative;
		display: grid;
		gap: 2px;
		padding: 12px 14px 14px;
		border-radius: var(--radius-l);
		color: var(--cream);
		cursor: pointer;
		outline: 3px solid transparent;
		outline-offset: 3px;
		transition:
			outline-color 0.2s,
			transform 0.25s var(--ease-spring);
	}
	.theme-noel {
		background: radial-gradient(circle at 50% 40%, #b8321f, #4a1a12 75%);
	}
	.theme-soiree {
		background: radial-gradient(circle at 50% 40%, #3c4560, #12141b 75%);
	}
	.theme.selected {
		outline-color: var(--cocoa);
	}
	.theme:has(:focus-visible) {
		outline-color: var(--red);
	}
	.theme:active {
		transform: scale(0.98);
	}
	.theme-art {
		width: 70%;
		margin: 0 auto 6px;
	}
	.theme strong {
		font-family: var(--font-display);
		font-size: 1.2rem;
		font-weight: 500;
	}
	.theme small {
		font-size: 0.78rem;
		line-height: 1.3;
		opacity: 0.75;
	}
	.theme.selected::after {
		content: '';
		position: absolute;
		top: 10px;
		right: 10px;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: var(--cream) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12.5l4 4L18 8' fill='none' stroke='%232b1d1a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/16px no-repeat;
	}

	.add-row,
	.ex-row {
		display: flex;
		gap: 8px;
		align-items: end;
	}
	.grow {
		flex: 1;
	}
	.btn-dark {
		background: var(--cocoa);
		color: var(--cream);
		min-height: 50px;
		flex-shrink: 0;
	}
	.btn-dark:hover:not(:disabled) {
		background: var(--cocoa-3);
	}
	.ex-row select {
		flex: 1;
		min-width: 0;
		padding: 0 10px;
	}
	.ex-sep {
		align-self: center;
		color: #8a6f62;
	}
	@media (max-width: 420px) {
		.ex-row {
			flex-wrap: wrap;
		}
		.ex-row select {
			flex-basis: calc(50% - 20px);
		}
		.ex-row .btn {
			width: 100%;
		}
	}
	.hint {
		font-size: 0.88rem;
		color: #8a6f62;
		margin-top: -6px;
	}
	.link {
		border: 0;
		background: none;
		padding: 0;
		color: var(--red);
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.warn {
		font-size: 0.88rem;
		color: var(--red-deep);
	}

	.people,
	.pairs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.people li,
	.pairs li {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 6px 6px 6px 14px;
		border-radius: 999px;
		background: var(--cocoa);
		color: var(--cream);
		font-weight: 500;
		animation: pop 0.35s var(--ease-spring);
	}
	.pairs li {
		background: rgba(43, 29, 26, 0.08);
		color: var(--cocoa);
	}
	.people button,
	.pairs button {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 0;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.1);
	}
	.pairs button {
		background: rgba(43, 29, 26, 0.08);
	}
	.people button:hover {
		background: var(--red);
	}
	.count {
		font-size: 0.9rem;
		font-weight: 600;
		color: #8a6f62;
	}
	.count.ok {
		color: var(--green);
	}
	.two {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 12px;
	}
	input[type='date'] {
		-webkit-appearance: none;
		appearance: none;
		min-width: 0;
		display: flex;
		align-items: center;
	}
	input[type='date']::-webkit-date-and-time-value {
		text-align: left;
	}

	.form-error {
		margin-top: 20px;
		padding: 14px 16px;
		border-radius: var(--radius-m);
		background: #f6d2c6;
		color: var(--red-deep);
		font-weight: 600;
	}
	.submit {
		width: 100%;
		min-height: 60px;
		margin-top: 24px;
		font-size: 1.1rem;
	}
	.fine {
		margin-top: 12px;
		text-align: center;
		font-size: 0.85rem;
		color: #8a6f62;
	}

	@keyframes pop {
		from {
			transform: scale(0.6);
			opacity: 0;
		}
	}
</style>
