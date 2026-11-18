import { error } from '@sveltejs/kit';
import { getDrawByAdminToken } from '$lib/server/repo';
import { subscribe } from '$lib/server/events';
import type { RequestHandler } from './$types';

/** Flux Server-Sent Events : statut des participants en direct. */
export const GET: RequestHandler = ({ params, request }) => {
	const draw = getDrawByAdminToken(params.token);
	if (!draw) error(404, 'Introuvable');

	const encoder = new TextEncoder();
	let cleanup = () => {};

	const stream = new ReadableStream({
		start(controller) {
			const send = (chunk: string) => {
				try {
					controller.enqueue(encoder.encode(chunk));
				} catch {
					cleanup();
				}
			};
			send('retry: 3000\n\n');
			const unsubscribe = subscribe(draw.id, (event) => send(`data: ${JSON.stringify(event)}\n\n`));
			// commentaire régulier pour garder la connexion ouverte derrière les proxys
			const heartbeat = setInterval(() => send(': ping\n\n'), 25_000);
			cleanup = () => {
				clearInterval(heartbeat);
				unsubscribe();
			};
			request.signal.addEventListener('abort', () => {
				cleanup();
				try {
					controller.close();
				} catch {
					/* déjà fermé */
				}
			});
		},
		cancel() {
			cleanup();
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream; charset=utf-8',
			'cache-control': 'no-store',
			'x-accel-buffering': 'no',
			connection: 'keep-alive'
		}
	});
};
