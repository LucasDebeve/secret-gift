/**
 * Tirage au sort : attribue à chaque participant une autre personne.
 *
 * Contraintes :
 *  - personne ne se tire soi-même ;
 *  - chaque personne est tirée exactement une fois ;
 *  - les paires exclues (dans les deux sens) sont interdites.
 *
 * On cherche d'abord une seule grande boucle (A→B→C→…→A) : c'est plus
 * agréable, personne ne se retrouve en « échange » à deux. Si les exclusions
 * rendent cela impossible, on se rabat sur n'importe quelle attribution
 * valide (couplage biparti), en évitant si possible les échanges à deux.
 */

export type Rng = (maxExclusive: number) => number;

const pairKey = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

export function buildExclusionSet(pairs: Array<[number, number]>): Set<string> {
	return new Set(pairs.map(([a, b]) => pairKey(a, b)));
}

function shuffle<T>(items: T[], rng: Rng): T[] {
	const out = items.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = rng(i + 1);
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

function allowed(giver: number, receiver: number, excluded: Set<string>) {
	return giver !== receiver && !excluded.has(pairKey(giver, receiver));
}

function singleCycle(ids: number[], excluded: Set<string>, rng: Rng): Map<number, number> | null {
	const order = shuffle(ids, rng);
	const start = order[0];
	const path = [start];
	const used = new Set([start]);
	let budget = 50_000;

	const dfs = (): boolean => {
		if (--budget < 0) return false;
		const last = path[path.length - 1];
		if (path.length === ids.length) return allowed(last, start, excluded);
		for (const next of shuffle(ids, rng)) {
			if (used.has(next) || !allowed(last, next, excluded)) continue;
			used.add(next);
			path.push(next);
			if (dfs()) return true;
			path.pop();
			used.delete(next);
		}
		return false;
	};

	if (!dfs()) return null;
	const result = new Map<number, number>();
	path.forEach((id, i) => result.set(id, path[(i + 1) % path.length]));
	return result;
}

function anyMatching(ids: number[], excluded: Set<string>, rng: Rng): Map<number, number> | null {
	// Algorithme de Kuhn avec ordres aléatoires.
	const receiverOf = new Map<number, number>(); // receiver -> giver
	const candidates = new Map(ids.map((g) => [g, shuffle(ids.filter((r) => allowed(g, r, excluded)), rng)]));

	const tryGiver = (giver: number, seen: Set<number>): boolean => {
		for (const r of candidates.get(giver)!) {
			if (seen.has(r)) continue;
			seen.add(r);
			const current = receiverOf.get(r);
			if (current === undefined || tryGiver(current, seen)) {
				receiverOf.set(r, giver);
				return true;
			}
		}
		return false;
	};

	for (const g of shuffle(ids, rng)) {
		if (!tryGiver(g, new Set())) return null;
	}
	const result = new Map<number, number>();
	for (const [r, g] of receiverOf) result.set(g, r);
	return result;
}

export function hasMutualPair(result: Map<number, number>): boolean {
	for (const [g, r] of result) if (result.get(r) === g) return true;
	return false;
}

export function assign(
	ids: number[],
	exclusions: Array<[number, number]>,
	rng: Rng
): Map<number, number> | null {
	if (ids.length < 2) return null;
	const excluded = buildExclusionSet(exclusions);

	for (let attempt = 0; attempt < 3; attempt++) {
		const cycle = singleCycle(ids, excluded, rng);
		if (cycle) return cycle;
	}

	let fallback: Map<number, number> | null = null;
	for (let attempt = 0; attempt < 30; attempt++) {
		const m = anyMatching(ids, excluded, rng);
		if (!m) return fallback; // impossible : inutile d'insister
		if (!hasMutualPair(m) || ids.length <= 2) return m;
		fallback ??= m;
	}
	return fallback;
}
