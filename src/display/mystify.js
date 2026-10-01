// "Mystify Your Mind"-style screen saver geometry (pure so it can be tested).

export const VERTICES = 4;
export const TRAIL = 9;

export const makePolygon = (width, height, rng = Math.random, hue = rng() * 360) => ({
    hue,
    points: Array.from({ length: VERTICES }, () => ({
        x: rng() * width,
        y: rng() * height,
        vx: (1.2 + rng() * 2.2) * (rng() < 0.5 ? -1 : 1),
        vy: (1.2 + rng() * 2.2) * (rng() < 0.5 ? -1 : 1)
    })),
    trail: []
});

// Advance one frame: move, bounce off the edges, remember the previous shape as a trail.
export const stepPolygon = (poly, width, height) => {
    const snapshot = poly.points.map(({ x, y }) => ({ x, y }));
    const points = poly.points.map((p) => {
        let { x, y, vx, vy } = p;
        x += vx;
        y += vy;
        if (x < 0) { x = -x; vx = Math.abs(vx); } else if (x > width) { x = 2 * width - x; vx = -Math.abs(vx); }
        if (y < 0) { y = -y; vy = Math.abs(vy); } else if (y > height) { y = 2 * height - y; vy = -Math.abs(vy); }
        return { x, y, vx, vy };
    });
    return { ...poly, hue: (poly.hue + 0.6) % 360, points, trail: [...poly.trail, snapshot].slice(-TRAIL) };
};
