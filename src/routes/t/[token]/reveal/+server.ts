import { error, json } from '@sveltejs/kit';
import { getParticipantByToken, getTargetName, markRevealed } from '$lib/server/repo';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ params }) => {
	const found = getParticipantByToken(params.token);
	if (!found) error(404, 'Lien invalide');
	markRevealed(found.participant);
	return json({ target: getTargetName(found.participant) }, { headers: { 'cache-control': 'no-store' } });
};
