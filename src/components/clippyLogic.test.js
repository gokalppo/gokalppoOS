import { describe, it, expect } from 'vitest';
import { createTipBag, nextDiscovery, DISCOVERY_ORDER } from './clippyLogic';

describe('tip bag', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];

    it('shows every tip once before any repeats', () => {
        const bag = createTipBag(Math.random);
        const round = Array.from({ length: pool.length }, () => bag.next('k', pool));
        expect([...round].sort()).toEqual(pool);
        const second = Array.from({ length: pool.length }, () => bag.next('k', pool));
        expect([...second].sort()).toEqual(pool);
    });

    it('never shows the same tip twice in a row, even across rounds', () => {
        for (let seed = 0; seed < 50; seed++) {
            let x = seed + 1;
            const random = () => { x = (x * 16807) % 2147483647; return x / 2147483647; };
            const bag = createTipBag(random);
            let previous = null;
            for (let i = 0; i < 40; i++) {
                const tip = bag.next('k', pool);
                expect(tip).not.toBe(previous);
                previous = tip;
            }
        }
    });

    it('keeps a separate bag per pool, and copes with tiny or empty pools', () => {
        const bag = createTipBag();
        expect(bag.next('one', ['only'])).toBe('only');
        expect(bag.next('one', ['only'])).toBe('only');
        expect(bag.next('none', [])).toBe('');
        const x = bag.next('x', ['p', 'q']);
        const y = bag.next('y', ['p', 'q']);
        expect(['p', 'q']).toContain(x);
        expect(['p', 'q']).toContain(y);
    });
});

describe('discovery nudges', () => {
    const tips = { discover: Object.fromEntries(DISCOVERY_ORDER.map((id) => [id, `tip ${id}`])) };

    it('suggests the first app that was not opened yet, in a fixed order', () => {
        expect(nextDiscovery(new Set(), tips)).toBe('terminal');
        expect(nextDiscovery(new Set(['terminal']), tips)).toBe('messenger');
        expect(nextDiscovery(new Set(['terminal', 'messenger', 'paint']), tips)).toBe('notepad');
    });

    it('stops once everything has been seen, and skips apps without a tip', () => {
        expect(nextDiscovery(new Set(DISCOVERY_ORDER), tips)).toBeNull();
        expect(nextDiscovery(new Set(), { discover: { paint: 'p' } })).toBe('paint');
        expect(nextDiscovery(new Set(), {})).toBeNull();
    });
});
