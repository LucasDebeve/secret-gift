<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>Introuvable · Secret Gift</title></svelte:head>

<main>
	<p class="code">{page.status}</p>
	<h1>{page.status === 404 ? 'Rien à déballer ici.' : 'Quelque chose s’est mal passé.'}</h1>
	<p>{page.error?.message}</p>
	<a class="btn btn-cream" href="/">Créer un tirage</a>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 16px;
		padding: 24px;
		text-align: center;
	}
	.code {
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.1rem;
		color: var(--sand);
	}
	h1 {
		font-size: clamp(2.2rem, 9vw, 3.4rem);
	}
	p {
		color: var(--muted);
		max-width: 36ch;
	}
</style>
