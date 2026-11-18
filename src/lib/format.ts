export function formatEventDate(iso: string | null | undefined): string | null {
	if (!iso) return null;
	const d = new Date(`${iso}T12:00:00`);
	if (Number.isNaN(d.getTime())) return null;
	return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

export function formatBudget(budget: number | null | undefined): string | null {
	if (!budget) return null;
	return `${budget} €`;
}

export function timeAgo(ts: number | null | undefined, now = Date.now()): string {
	if (!ts) return '';
	const s = Math.max(0, Math.round((now - ts) / 1000));
	if (s < 45) return 'à l’instant';
	const m = Math.round(s / 60);
	if (m < 60) return `il y a ${m} min`;
	const h = Math.round(m / 60);
	if (h < 24) return `il y a ${h} h`;
	const d = Math.round(h / 24);
	if (d === 1) return 'hier';
	return `il y a ${d} jours`;
}
