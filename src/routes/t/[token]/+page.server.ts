import { error } from '@sveltejs/kit';
import { getParticipantByToken, getRetiredDraw, getTargetName } from '$lib/server/repo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });

	const found = getParticipantByToken(params.token);
	if (!found) {
		const retired = getRetiredDraw(params.token);
		if (retired) return { status: 'retired' as const, draw: retired };
		error(404, 'Ce lien ne correspond à aucun tirage.');
	}

	const { participant, draw } = found;
	return {
		status: 'active' as const,
		name: participant.name,
		draw: {
			title: draw.title,
			organizer: draw.organizer,
			theme: draw.theme,
			budget: draw.budget,
			eventDate: draw.event_date
		},
		// Le nom n'est envoyé dans la page que si la personne l'a déjà découvert.
		target: participant.revealed_at ? getTargetName(participant) : null
	};
};
