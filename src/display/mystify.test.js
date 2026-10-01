import { describe, it, expect } from 'vitest';
import { makePolygon, stepPolygon, VERTICES, TRAIL } from './mystify';

const seeded = (seed) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
};

describe('mystify polygons', () => {
    it('start inside the screen with the right number of vertices', () => {
        const poly = makePolygon(800, 600, seeded(3));
        expect(poly.points).toHaveLength(VERTICES);
        for (const p of poly.points) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x).toBeLessThanOrEqual(800);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y).toBeLessThanOrEqual(600);
        }
    });

    it('never leave the screen however long they run (they bounce)', () => {
        let poly = makePolygon(300, 200, seeded(9));
        for (let i = 0; i < 5000; i++) {
            poly = stepPolygon(poly, 300, 200);
            for (const p of poly.points) {
                expect(p.x).toBeGreaterThanOrEqual(0);
                expect(p.x).toBeLessThanOrEqual(300);
                expect(p.y).toBeGreaterThanOrEqual(0);
                expect(p.y).toBeLessThanOrEqual(200);
            }
        }
    });

    it('flip the velocity when they hit a wall', () => {
        const poly = { hue: 0, trail: [], points: [{ x: 1, y: 100, vx: -3, vy: 0 }] };
        const next = stepPolygon(poly, 400, 300);
        expect(next.points[0].vx).toBeGreaterThan(0);
        expect(next.points[0].x).toBeGreaterThanOrEqual(0);
    });

    it('keep a bounded trail of earlier shapes and cycle the hue', () => {
        let poly = makePolygon(400, 300, seeded(5));
        for (let i = 0; i < TRAIL + 6; i++) poly = stepPolygon(poly, 400, 300);
        expect(poly.trail).toHaveLength(TRAIL);
        expect(poly.hue).toBeGreaterThanOrEqual(0);
        expect(poly.hue).toBeLessThan(360);
    });

    it('does not mutate the previous state', () => {
        const poly = makePolygon(400, 300, seeded(1));
        const before = JSON.stringify(poly);
        stepPolygon(poly, 400, 300);
        expect(JSON.stringify(poly)).toBe(before);
    });
});
