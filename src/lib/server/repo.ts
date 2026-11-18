import { createHash, randomBytes, randomInt } from 'node:crypto';
import { db } from './db';
import { assign } from './assign';
import { publish } from './events';
import type { ThemeId } from '$lib/themes';

export const LIMITS = { minPeople: 3, maxPeople: 100, name: 40, title: 80, organizer: 40 };

const token = (bytes: number) => randomBytes(bytes).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
const rng = (n: number) => randomInt(n);

export class DrawError extends Error {}

export type DrawRow = {
	id: string;
	title: string;
	organizer: string | null;
	theme: ThemeId;
	budget: number | null;
	event_date: string | null;
	round: number;
	created_at: number;
	drawn_at: number;
};

export type ParticipantRow = {
	id: number;
	draw_id: string;
	position: number;
	name: string;
	token: string;
	target_id: number | null;
	opened_at: number | null;
	revealed_at: number | null;
};

const DRAW_COLUMNS = 'id, title, organizer, theme, budget, event_date, round, created_at, drawn_at';

/** Tire au sort et enregistre les cibles + de nouveaux liens. À appeler dans une transaction. */
function runAssignment(drawId: string) {
	const people = db
		.prepare('SELECT id FROM participants WHERE draw_id = ? ORDER BY position')
		.all(drawId) as Array<{ id: number }>;
	const pairs = db
		.prepare('SELECT a_id, b_id FROM exclusions WHERE draw_id = ?')
		.all(drawId) as Array<{ a_id: number; b_id: number }>;

	const result = assign(
		people.map((p) => p.id),
		pairs.map((p) => [p.a_id, p.b_id]),
		rng
	);
	if (!result) {
		throw new DrawError(
			'Impossible de faire un tirage avec ces exclusions : retire-en quelques-unes pour laisser plus de combinaisons.'
		);
	}

	const update = db.prepare(
		'UPDATE participants SET target_id = ?, token = ?, opened_at = NULL, revealed_at = NULL WHERE id = ?'
	);
	for (const [giver, receiver] of result) update.run(receiver, token(12), giver);
}

export type NewDraw = {
	title: string;
	organizer: string | null;
	theme: ThemeId;
	budget: number | null;
	eventDate: string | null;
	names: string[];
	/** paires d'index dans `names` */
	exclusions: Array<[number, number]>;
};

export function createDraw(input: NewDraw): { adminToken: string; drawId: string } {
	const adminToken = token(24);
	const drawId = token(9);
	const now = Date.now();

	db.transaction(() => {
		db.prepare(
			`INSERT INTO draws (id, admin_hash, title, organizer, theme, budget, event_date, created_at, drawn_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
		).run(drawId, hashToken(adminToken), input.title, input.organizer, input.theme, input.budget, input.eventDate, now, now);

		const insert = db.prepare(
			'INSERT INTO participants (draw_id, position, name, token) VALUES (?, ?, ?, ?)'
		);
		const ids = input.names.map((name, i) => Number(insert.run(drawId, i, name, token(12)).lastInsertRowid));

		const ex = db.prepare('INSERT OR IGNORE INTO exclusions (draw_id, a_id, b_id) VALUES (?, ?, ?)');
		for (const [a, b] of input.exclusions) {
			const [x, y] = [ids[a], ids[b]].sort((p, q) => p - q);
			ex.run(drawId, x, y);
		}

		runAssignment(drawId);
	})();

	return { adminToken, drawId };
}

export function getDrawByAdminToken(adminToken: string): DrawRow | undefined {
	return db
		.prepare(`SELECT ${DRAW_COLUMNS} FROM draws WHERE admin_hash = ?`)
		.get(hashToken(adminToken)) as DrawRow | undefined;
}

export function listParticipants(drawId: string) {
	return db
		.prepare(
			'SELECT id, name, token, opened_at, revealed_at FROM participants WHERE draw_id = ? ORDER BY position'
		)
		.all(drawId) as Array<Pick<ParticipantRow, 'id' | 'name' | 'token' | 'opened_at' | 'revealed_at'>>;
}

export function listExclusions(drawId: string) {
	return db
		.prepare(
			`SELECT a.name AS a, b.name AS b FROM exclusions e
			 JOIN participants a ON a.id = e.a_id JOIN participants b ON b.id = e.b_id
			 WHERE e.draw_id = ? ORDER BY a.position, b.position`
		)
		.all(drawId) as Array<{ a: string; b: string }>;
}

export function getParticipantByToken(t: string) {
	const participant = db
		.prepare('SELECT * FROM participants WHERE token = ?')
		.get(t) as ParticipantRow | undefined;
	if (!participant) return undefined;
	const draw = db.prepare(`SELECT ${DRAW_COLUMNS} FROM draws WHERE id = ?`).get(participant.draw_id) as DrawRow;
	return { participant, draw };
}

export function getRetiredDraw(t: string) {
	return db
		.prepare(
			`SELECT d.title, d.organizer, d.theme FROM retired_tokens r JOIN draws d ON d.id = r.draw_id WHERE r.token = ?`
		)
		.get(t) as Pick<DrawRow, 'title' | 'organizer' | 'theme'> | undefined;
}

export function getTargetName(participant: ParticipantRow): string {
	const row = db.prepare('SELECT name FROM participants WHERE id = ?').get(participant.target_id) as
		| { name: string }
		| undefined;
	return row?.name ?? '';
}

function emitStatus(p: ParticipantRow) {
	const fresh = db
		.prepare('SELECT opened_at, revealed_at FROM participants WHERE id = ?')
		.get(p.id) as Pick<ParticipantRow, 'opened_at' | 'revealed_at'>;
	publish(p.draw_id, {
		type: 'status',
		participantId: p.id,
		openedAt: fresh.opened_at,
		revealedAt: fresh.revealed_at
	});
}

export function markOpened(p: ParticipantRow) {
	const r = db
		.prepare('UPDATE participants SET opened_at = ? WHERE id = ? AND opened_at IS NULL')
		.run(Date.now(), p.id);
	if (r.changes) emitStatus(p);
}

export function markRevealed(p: ParticipantRow) {
	const now = Date.now();
	const r = db
		.prepare(
			'UPDATE participants SET revealed_at = ?, opened_at = COALESCE(opened_at, ?) WHERE id = ? AND revealed_at IS NULL'
		)
		.run(now, now, p.id);
	if (r.changes) emitStatus(p);
}

export function redraw(drawId: string) {
	db.transaction(() => {
		const now = Date.now();
		db.prepare(
			'INSERT OR IGNORE INTO retired_tokens (token, draw_id, retired_at) SELECT token, draw_id, ? FROM participants WHERE draw_id = ?'
		).run(now, drawId);
		runAssignment(drawId);
		db.prepare('UPDATE draws SET round = round + 1, drawn_at = ? WHERE id = ?').run(now, drawId);
	})();
	publish(drawId, { type: 'redrawn' });
}

export function deleteDraw(drawId: string) {
	db.prepare('DELETE FROM draws WHERE id = ?').run(drawId);
	publish(drawId, { type: 'deleted' });
}
