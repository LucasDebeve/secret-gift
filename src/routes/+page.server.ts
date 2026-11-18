import { fail, redirect } from '@sveltejs/kit';
import { createDraw, DrawError, LIMITS } from '$lib/server/repo';
import { isTheme } from '$lib/themes';
import type { Actions } from './$types';

const clean = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const title = clean(form.get('title'));
		const organizer = clean(form.get('organizer')) || null;
		const theme = form.get('theme');
		const budgetRaw = clean(form.get('budget'));
		const eventDate = clean(form.get('eventDate')) || null;
		const names = form.getAll('participant').map(clean).filter(Boolean);
		let exclusionsRaw: Array<[string, string]> = [];
		try {
			const parsed = JSON.parse(String(form.get('exclusions') || '[]'));
			if (Array.isArray(parsed)) {
				exclusionsRaw = parsed
					.filter((p) => Array.isArray(p) && p.length === 2)
					.map((p) => [clean(String(p[0])), clean(String(p[1]))]);
			}
		} catch {
			/* ignoré : pas d'exclusion */
		}

		const fields = { title, organizer, theme, budget: budgetRaw, eventDate, names, exclusions: exclusionsRaw };
		const problem = (message: string) => fail(400, { ...fields, message });

		if (!title) return problem('Donne un nom à ton tirage.');
		if (title.length > LIMITS.title) return problem('Le nom du tirage est trop long.');
		if (organizer && organizer.length > LIMITS.organizer) return problem('Ton prénom est trop long.');
		if (!isTheme(theme)) return problem('Choisis un thème.');

		let budget: number | null = null;
		if (budgetRaw) {
			budget = Number(budgetRaw.replace(',', '.'));
			if (!Number.isFinite(budget) || budget <= 0 || budget > 100000) return problem('Le budget doit être un montant positif.');
			budget = Math.round(budget);
		}
		if (eventDate && !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return problem('La date est invalide.');

		if (names.length < LIMITS.minPeople) return problem(`Il faut au moins ${LIMITS.minPeople} participants.`);
		if (names.length > LIMITS.maxPeople) return problem(`${LIMITS.maxPeople} participants maximum.`);
		if (names.some((n) => n.length > LIMITS.name)) return problem(`Un prénom dépasse ${LIMITS.name} caractères.`);
		const lower = names.map((n) => n.toLocaleLowerCase('fr'));
		const dup = names.find((_, i) => lower.indexOf(lower[i]) !== i);
		if (dup) return problem(`« ${dup} » apparaît deux fois : ajoute une initiale pour les distinguer.`);

		const exclusions: Array<[number, number]> = [];
		for (const pair of exclusionsRaw) {
			const [a, b] = pair.map((x) => lower.indexOf(x.toLocaleLowerCase('fr')));
			if (a < 0 || b < 0 || a === b) continue;
			exclusions.push([a, b]);
		}

		let adminToken: string;
		try {
			({ adminToken } = createDraw({ title, organizer, theme, budget, eventDate, names, exclusions }));
		} catch (e) {
			if (e instanceof DrawError) return problem(e.message);
			throw e;
		}
		redirect(303, `/admin/${adminToken}?nouveau`);
	}
};
