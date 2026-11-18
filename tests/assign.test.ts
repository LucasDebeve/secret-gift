import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { assign, buildExclusionSet } from '../src/lib/server/assign.ts';

const rng = (n: number) => randomInt(n);
const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

function check(ids: number[], ex: Array<[number, number]>, result: Map<number, number>) {
	const set = buildExclusionSet(ex);
	assert.equal(result.size, ids.length);
	assert.deepEqual([...result.values()].sort((a, b) => a - b), ids.slice().sort((a, b) => a - b));
	for (const [g, r] of result) {
		assert.notEqual(g, r);
		assert.ok(!set.has(key(g, r)), `exclusion violée ${g}->${r}`);
	}
}

test('attribution valide sans exclusion, une seule boucle', () => {
	for (let n = 2; n <= 40; n++) {
		const ids = Array.from({ length: n }, (_, i) => i + 1);
		const r = assign(ids, [], rng)!;
		check(ids, [], r);
		// une seule boucle
		let cur = ids[0];
		const seen = new Set<number>();
		while (!seen.has(cur)) {
			seen.add(cur);
			cur = r.get(cur)!;
		}
		assert.equal(seen.size, n);
	}
});

test('respecte les exclusions', () => {
	const ids = [1, 2, 3, 4, 5, 6];
	const ex: Array<[number, number]> = [[1, 2], [3, 4], [5, 6], [1, 3]];
	for (let i = 0; i < 200; i++) check(ids, ex, assign(ids, ex, rng)!);
});

test('détecte un tirage impossible', () => {
	// 1 est exclu de tout le monde
	assert.equal(assign([1, 2, 3], [[1, 2], [1, 3]], rng), null);
});

test('retombe sur un couplage quand aucune boucle unique n\'existe', () => {
	// 4 personnes : 1-3, 1-4, 2-3, 2-4 exclus → seul 1↔2 et 3↔4 possible
	const ids = [1, 2, 3, 4];
	const ex: Array<[number, number]> = [[1, 3], [1, 4], [2, 3], [2, 4]];
	const r = assign(ids, ex, rng)!;
	check(ids, ex, r);
	assert.equal(r.get(1), 2);
	assert.equal(r.get(3), 4);
});
