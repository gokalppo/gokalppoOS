import { describe, it, expect } from 'vitest';
import { PROJECTS } from './projects';

describe('project data', () => {
    it('has unique slugs and ids', () => {
        expect(new Set(PROJECTS.map((p) => p.slug)).size).toBe(PROJECTS.length);
        expect(new Set(PROJECTS.map((p) => p.id)).size).toBe(PROJECTS.length);
    });

    it('has English and Turkish text for every project', () => {
        for (const p of PROJECTS) {
            for (const field of ['summary', 'description']) {
                expect(p[field].en.length, `${p.slug}.${field}.en`).toBeGreaterThan(10);
                expect(p[field].tr.length, `${p.slug}.${field}.tr`).toBeGreaterThan(10);
            }
        }
    });

    it('only links to https URLs', () => {
        for (const p of PROJECTS) {
            for (const url of Object.values(p.links || {})) expect(url, p.slug).toMatch(/^https:\/\//);
        }
    });

    it('keeps the private project without a source link', () => {
        expect(PROJECTS.find((p) => p.slug === 'cindranet').links.source).toBeUndefined();
    });
});
