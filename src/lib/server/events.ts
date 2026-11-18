/** Petit bus d'événements en mémoire pour le suivi en direct (SSE). */

export type DrawEvent =
	| { type: 'status'; participantId: number; openedAt: number | null; revealedAt: number | null }
	| { type: 'redrawn' }
	| { type: 'deleted' };

type Listener = (event: DrawEvent) => void;

const listeners = new Map<string, Set<Listener>>();

export function subscribe(drawId: string, listener: Listener): () => void {
	let set = listeners.get(drawId);
	if (!set) listeners.set(drawId, (set = new Set()));
	set.add(listener);
	return () => {
		set!.delete(listener);
		if (set!.size === 0) listeners.delete(drawId);
	};
}

export function publish(drawId: string, event: DrawEvent) {
	for (const listener of listeners.get(drawId) ?? []) {
		try {
			listener(event);
		} catch {
			/* un client déconnecté ne doit pas bloquer les autres */
		}
	}
}
