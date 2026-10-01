import { describe, it, expect, vi } from 'vitest';
import { respond, createBotState } from './botEngine';

// When Gökalp fills in src/data/botNotes.js, the bot uses it instead of saying it does not know.
vi.mock('../../../data/botNotes', () => ({
    PROJECT_NOTES: {
        cindranet: {
            challenge: { en: 'The hardest part was NAT traversal.', tr: 'En zor kısım NAT aşmaktı.' },
            learned: { en: 'I learned a lot about protocols.', tr: 'Protokoller hakkında çok şey öğrendim.' }
        }
    },
    PERSONAL_FACTS: {
        hobbies: { en: 'He enjoys chess.', tr: 'Satranç oynamayı sever.' },
        location: { en: 'He is based in Turkey.', tr: 'Türkiye\'de yaşıyor.' },
        availability: { en: 'He is open to internships.', tr: 'Staja açık.' },
        languages: null,
        university: { en: 'He studies at a Turkish university.', tr: 'Bir Türk üniversitesinde okuyor.' }
    }
}));

const ask = (messages, lang = 'en') => {
    let state = createBotState();
    let last;
    for (const m of messages) {
        last = respond(m, state, { lang, random: () => 0 });
        state = last.state;
    }
    return last.replies.map((r) => r.text).join('\n');
};

describe('bot notes written by Gökalp', () => {
    it('uses project notes for "what was hardest" and "what did he learn"', () => {
        expect(ask(['cindranet', 'what was the hardest part?'])).toBe('The hardest part was NAT traversal.');
        expect(ask(['cindranet', 'what did he learn?'])).toBe('I learned a lot about protocols.');
        expect(ask(['cindranet', 'en zor kısmı neydi'], 'tr')).toBe('En zor kısım NAT aşmaktı.');
    });

    it('still says it does not know for projects without notes', () => {
        expect(ask(['totp', 'what was the hardest part?'])).toMatch(/don't have Gökalp's own notes/);
    });

    it('answers personal questions he chose to share', () => {
        expect(ask(['what are his hobbies?'])).toBe('He enjoys chess.');
        expect(ask(['where does he live?'])).toBe('He is based in Turkey.');
        expect(ask(['hobileri neler'], 'tr')).toBe('Satranç oynamayı sever.');
        expect(ask(['what does he study?'])).toBe('He studies at a Turkish university.');
    });

    it('adds his availability note before the usual hiring advice', () => {
        expect(ask(['is he available for an internship?'])).toMatch(/^He is open to internships\./);
    });

    it('still deflects what he did not share', () => {
        expect(ask(['how old is he?'])).toMatch(/more personal|don't have that information/);
    });
});
