export const THEMES = {
	noel: {
		id: 'noel',
		label: 'Noël',
		tagline: 'Sucre d’orge, hotte et étoiles',
		verb: 'offres un cadeau à'
	},
	soiree: {
		id: 'soiree',
		label: 'Soirée',
		tagline: 'Sobre, doré, pour toutes les occasions',
		verb: 'offres un cadeau à'
	}
} as const;

export type ThemeId = keyof typeof THEMES;

export function isTheme(value: unknown): value is ThemeId {
	return typeof value === 'string' && value in THEMES;
}
