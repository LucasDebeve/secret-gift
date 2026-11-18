/**
 * Explosion de particules sur un <canvas> plein écran.
 * Noël : étoiles et flocons ; Soirée : confettis dorés.
 */
type Particle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	size: number;
	rot: number;
	vr: number;
	color: string;
	shape: 'star' | 'dot' | 'rect';
	life: number;
	drag: number;
};

const PALETTES = {
	noel: ['#fff4e4', '#f7e3cc', '#f2b84b', '#e04a33', '#ffffff', '#2e7d50'],
	soiree: ['#f6dca6', '#e8c88a', '#fff6e4', '#c79a58', '#e07a5f', '#ffffff']
};

function drawStar(ctx: CanvasRenderingContext2D, r: number) {
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const rad = i % 2 === 0 ? r : r * 0.45;
		const a = (Math.PI / 5) * i - Math.PI / 2;
		ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
	}
	ctx.closePath();
	ctx.fill();
}

export function burst(
	canvas: HTMLCanvasElement,
	theme: 'noel' | 'soiree',
	origin: { x: number; y: number },
	count = 140
): () => void {
	const ctx = canvas.getContext('2d');
	if (!ctx) return () => {};
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	const w = canvas.clientWidth;
	const h = canvas.clientHeight;
	canvas.width = w * dpr;
	canvas.height = h * dpr;
	ctx.scale(dpr, dpr);

	const palette = PALETTES[theme];
	const particles: Particle[] = Array.from({ length: count }, () => {
		const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6;
		const speed = 6 + Math.random() * 13;
		const shapes: Particle['shape'][] = theme === 'noel' ? ['star', 'star', 'dot'] : ['rect', 'rect', 'dot'];
		return {
			x: origin.x,
			y: origin.y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			size: 4 + Math.random() * 8,
			rot: Math.random() * Math.PI,
			vr: (Math.random() - 0.5) * 0.3,
			color: palette[Math.floor(Math.random() * palette.length)],
			shape: shapes[Math.floor(Math.random() * shapes.length)],
			life: 1,
			drag: 0.955 + Math.random() * 0.025
		};
	});

	let frame = 0;
	let raf = 0;
	const tick = () => {
		frame++;
		ctx.clearRect(0, 0, w, h);
		let alive = 0;
		for (const p of particles) {
			p.vx *= p.drag;
			p.vy = p.vy * p.drag + 0.32;
			// petit flottement latéral, comme de la neige
			p.x += p.vx + Math.sin((frame + p.size * 10) / 12) * 0.6;
			p.y += p.vy;
			p.rot += p.vr;
			if (frame > 50) p.life -= 0.012;
			if (p.life <= 0 || p.y > h + 40) continue;
			alive++;
			ctx.save();
			ctx.globalAlpha = Math.max(0, p.life);
			ctx.translate(p.x, p.y);
			ctx.rotate(p.rot);
			ctx.fillStyle = p.color;
			if (p.shape === 'star') drawStar(ctx, p.size);
			else if (p.shape === 'dot') {
				ctx.beginPath();
				ctx.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
				ctx.fill();
			} else {
				ctx.scale(1, Math.cos(frame / 6 + p.size));
				ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
			}
			ctx.restore();
		}
		if (alive > 0) raf = requestAnimationFrame(tick);
		else ctx.clearRect(0, 0, w, h);
	};
	raf = requestAnimationFrame(tick);
	return () => cancelAnimationFrame(raf);
}
