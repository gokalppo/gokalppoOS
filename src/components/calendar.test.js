import { describe, it, expect } from 'vitest';
import { buildMonthGrid, daysInMonth, shiftMonth, isSameDay, monthName, weekdayNames } from './calendar';

describe('daysInMonth', () => {
    it('handles regular, 30-day and leap-year months', () => {
        expect(daysInMonth(2025, 0)).toBe(31);
        expect(daysInMonth(2025, 3)).toBe(30);
        expect(daysInMonth(2025, 1)).toBe(28);
        expect(daysInMonth(2024, 1)).toBe(29);
    });
});

describe('buildMonthGrid', () => {
    it('is always 6 weeks of 7 days', () => {
        for (const [y, m] of [[2025, 1], [2024, 1], [2026, 9], [2026, 11]]) {
            const grid = buildMonthGrid(y, m);
            expect(grid).toHaveLength(6);
            grid.forEach((week) => expect(week).toHaveLength(7));
        }
    });

    it('starts the 1st on the correct weekday (Sunday-first)', () => {
        // 1 Oct 2026 is a Thursday -> index 4 in the first row.
        const grid = buildMonthGrid(2026, 9);
        const index = grid[0].findIndex((c) => c.inMonth && c.day === 1);
        expect(index).toBe(4);
    });

    it('contains each day of the month exactly once, flagged inMonth', () => {
        const days = buildMonthGrid(2024, 1).flat().filter((c) => c.inMonth).map((c) => c.day);
        expect(days).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
    });

    it('fills the leading/trailing cells with neighbouring months', () => {
        const grid = buildMonthGrid(2026, 9);
        expect(grid[0][0]).toMatchObject({ inMonth: false, month: 8, day: 27 });
        const last = grid[5][6];
        expect(last.inMonth).toBe(false);
        expect(last.month).toBe(10);
    });
});

describe('shiftMonth', () => {
    it('rolls over year boundaries in both directions', () => {
        expect(shiftMonth(2025, 11, 1)).toEqual({ year: 2026, month: 0 });
        expect(shiftMonth(2025, 0, -1)).toEqual({ year: 2024, month: 11 });
        expect(shiftMonth(2025, 5, 0)).toEqual({ year: 2025, month: 5 });
    });
});

describe('isSameDay', () => {
    it('compares calendar days, ignoring time', () => {
        expect(isSameDay(new Date(2026, 9, 1, 3), new Date(2026, 9, 1, 22))).toBe(true);
        expect(isSameDay(new Date(2026, 9, 1), new Date(2026, 9, 2))).toBe(false);
    });
});

describe('localized names', () => {
    it('gives English and Turkish month names', () => {
        expect(monthName('en', 9)).toBe('October');
        expect(monthName('tr', 9)).toBe('Ekim');
    });

    it('lists seven weekdays, Sunday first', () => {
        const en = weekdayNames('en');
        expect(en).toHaveLength(7);
        expect(en[0].toLowerCase()).toContain('sun');
        expect(weekdayNames('tr')[0].toLowerCase()).toContain('paz');
    });
});
