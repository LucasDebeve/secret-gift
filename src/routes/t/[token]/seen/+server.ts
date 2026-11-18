import { error } from '@sveltejs/kit';
import { getParticipantByToken, markOpened } from '$lib/server/repo';
import type { RequestHandler } from './$types';

/**
 * Appelé par le navigateur une fois la page affichée. On ne marque pas
 * « ouvert » au chargement serveur : les aperçus de liens (WhatsApp,
 * iMessage…) déclencheraient un faux positif.
 */
export const POST: RequestHandler = ({ params }) => {
	const found = getParticipantByToken(params.token);
	if (!found) error(404, 'Lien invalide');
	markOpened(found.participant);
	return new Response(null, { status: 204 });
};
