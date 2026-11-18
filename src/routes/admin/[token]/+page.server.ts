import { error, fail, redirect } from '@sveltejs/kit';
import {
	deleteDraw,
	DrawError,
	getDrawByAdminToken,
	listExclusions,
	listParticipants,
	redraw
} from '$lib/server/repo';
import type { Actions, PageServerLoad } from './$types';

function requireDraw(token: string) {
	const draw = getDrawByAdminToken(token);
	if (!draw) error(404, 'Ce lien d’administration ne correspond à aucun tirage.');
	return draw;
}

export const load: PageServerLoad = ({ params, setHeaders, depends }) => {
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' });
	depends('app:draw');
	const draw = requireDraw(params.token);
	return {
		draw,
		// Volontairement : aucune information sur « qui a tiré qui ».
		participants: listParticipants(draw.id),
		exclusions: listExclusions(draw.id)
	};
};

export const actions: Actions = {
	redraw: ({ params }) => {
		const draw = requireDraw(params.token);
		try {
			redraw(draw.id);
		} catch (e) {
			if (e instanceof DrawError) return fail(400, { message: e.message });
			throw e;
		}
		return { redrawn: true };
	},
	delete: ({ params }) => {
		const draw = requireDraw(params.token);
		deleteDraw(draw.id);
		redirect(303, '/?supprime');
	}
};
