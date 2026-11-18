import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { env } from '$env/dynamic/private';

const file = resolve(env.DATABASE_PATH || './data/secret-gift.db');
mkdirSync(dirname(file), { recursive: true });

export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS draws (
	id          TEXT PRIMARY KEY,
	admin_hash  TEXT NOT NULL UNIQUE,
	title       TEXT NOT NULL,
	organizer   TEXT,
	theme       TEXT NOT NULL,
	budget      INTEGER,
	event_date  TEXT,
	round       INTEGER NOT NULL DEFAULT 1,
	created_at  INTEGER NOT NULL,
	drawn_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
	id          INTEGER PRIMARY KEY AUTOINCREMENT,
	draw_id     TEXT NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
	position    INTEGER NOT NULL,
	name        TEXT NOT NULL,
	token       TEXT NOT NULL UNIQUE,
	target_id   INTEGER REFERENCES participants(id),
	opened_at   INTEGER,
	revealed_at INTEGER
);
CREATE INDEX IF NOT EXISTS participants_draw ON participants(draw_id);

CREATE TABLE IF NOT EXISTS exclusions (
	draw_id TEXT NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
	a_id    INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
	b_id    INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
	PRIMARY KEY (draw_id, a_id, b_id)
);

-- Liens remplacés lors d'une relance : on garde une trace pour afficher
-- un message clair plutôt qu'une simple erreur 404.
CREATE TABLE IF NOT EXISTS retired_tokens (
	token      TEXT PRIMARY KEY,
	draw_id    TEXT NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
	retired_at INTEGER NOT NULL
);
`);
