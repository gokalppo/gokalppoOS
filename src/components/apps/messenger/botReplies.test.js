import { describe, it, expect } from 'vitest';
import { getBotReply, getBotGreeting, botTypingDelayMs, BOT_NAME } from './botReplies';
import { PROJECTS } from '../../../data/projects';

const reply = (text, lang = 'en') => getBotReply(text, lang).text;

describe('Gökalp Bot', () => {
    it('greets in both languages and says it is a bot', () => {
        expect(reply('hello')).toMatch(/automated assistant/);
        expect(reply('merhaba', 'tr')).toMatch(/otomatik asistan/);
        expect(getBotGreeting('en').text).toContain(BOT_NAME);
    });

    it('is honest that it is not the real person', () => {
        expect(reply('are you a bot?')).toMatch(/not the real Gökalp/);
        expect(reply('sen kimsin', 'tr')).toMatch(/gerçek Gökalp değilim/i);
    });

    it('lists every project when asked about projects', () => {
        const text = reply('what projects do you have?');
        for (const p of PROJECTS) expect(text).toContain(p.title);
        const tr = reply('projeler neler', 'tr');
        for (const p of PROJECTS) expect(tr).toContain(p.title);
    });

    it('answers about one project by name or keyword, with its source link', () => {
        expect(reply('tell me about the totp token')).toContain('github.com/gokalppo/ESP32-Hardware-TOTP-Token');
        expect(reply('what is cindranet?')).toMatch(/Private repository/);
        expect(reply('esp32 ile ne yaptı', 'tr')).toContain('IoT Smart Air Quality');
        expect(reply('opencv scanner')).toContain('Document Scanner');
    });

    it('mentions the demo for the project that has one', () => {
        expect(reply('iot project')).toContain('youtube.com/shorts');
    });

    it('lists skills from the real technology data', () => {
        const text = reply('what are his skills?');
        for (const word of ['C++', 'Rust', 'React 19', 'ESP32', 'OpenCV']) expect(text).toContain(word);
        expect(reply('yetenekler', 'tr')).toContain('Diller');
    });

    it('gives contact details and profile links', () => {
        expect(reply('how can I contact him?')).toContain('ekergokalp@gmail.com');
        expect(reply('iletişim', 'tr')).toContain('ekergokalp@gmail.com');
        expect(reply('github?')).toContain('github.com/gokalppo');
        expect(reply('linkedin')).toContain('linkedin.com/in/gokalp-eker');
    });

    it('explains how to open the resume', () => {
        expect(reply('can I see your resume')).toMatch(/My Resume/);
        expect(reply('özgeçmiş', 'tr')).toMatch(/My Resume/);
    });

    it('handles thanks, goodbye, help, easter eggs and the site itself', () => {
        expect(reply('thanks!')).toMatch(/welcome/i);
        expect(reply('bye')).toMatch(/Guestbook/);
        expect(getBotReply('bye').suggestions).toEqual([]);
        expect(reply('help')).toMatch(/projects/);
        expect(reply('any easter egg?')).toMatch(/Konami/);
        expect(reply('how was this site built')).toMatch(/React/);
    });

    it('falls back politely with suggestions for anything else', () => {
        const r = getBotReply('asdf qwerty zzz');
        expect(r.text).toMatch(/didn't catch that/);
        expect(r.suggestions.length).toBeGreaterThan(0);
        expect(reply('blabla', 'tr')).toMatch(/anlayamadım/);
    });

    it('treats blank input as a request for help', () => {
        expect(reply('   ')).toMatch(/I can talk about/);
        expect(reply(undefined)).toMatch(/I can talk about/);
    });

    it('every suggested button leads to a real answer (never the fallback)', () => {
        for (const lang of ['en', 'tr']) {
            const { suggestions } = getBotGreeting(lang);
            const fallback = getBotReply('asdf qwerty', lang).text;
            for (const label of suggestions) {
                expect(getBotReply(label, lang).text, `${lang}:${label}`).not.toBe(fallback);
            }
        }
    });

    it('never returns an empty reply', () => {
        for (const input of ['', 'x', 'hello', 'projects', '???', '😀']) {
            expect(getBotReply(input).text.length).toBeGreaterThan(0);
        }
    });

    it('types for a bounded, length-based time', () => {
        expect(botTypingDelayMs('hi')).toBeLessThan(botTypingDelayMs('x'.repeat(100)));
        expect(botTypingDelayMs('x'.repeat(5000))).toBeLessThanOrEqual(1400);
    });
});
