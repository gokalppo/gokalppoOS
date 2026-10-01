import { describe, it, expect } from 'vitest';
import { translations } from './translations';
import { translate, detectLanguage, isSupported, localized } from './translate';
import { CLIPPY_TIPS } from './clippyTips';

describe('translations', () => {
    const enKeys = Object.keys(translations.en).sort();
    const trKeys = Object.keys(translations.tr).sort();

    it('have exactly the same keys in every language', () => {
        expect(trKeys).toEqual(enKeys);
    });

    it('never leave a value empty', () => {
        for (const lang of Object.keys(translations)) {
            for (const [key, value] of Object.entries(translations[lang])) {
                expect(value.trim().length, `${lang}:${key}`).toBeGreaterThan(0);
            }
        }
    });

    it('use the same {placeholders} in every language', () => {
        const params = (s) => (s.match(/\{\w+\}/g) || []).sort();
        for (const key of enKeys) {
            expect(params(translations.tr[key]), key).toEqual(params(translations.en[key]));
        }
    });
});

describe('translate', () => {
    const dict = { en: { hi: 'Hello {name}', only: 'English only' }, tr: { hi: 'Merhaba {name}' } };

    it('interpolates params', () => {
        expect(translate(dict, 'tr', 'hi', { name: 'Ayşe' })).toBe('Merhaba Ayşe');
    });

    it('falls back to English, then to the key', () => {
        expect(translate(dict, 'tr', 'only')).toBe('English only');
        expect(translate(dict, 'tr', 'missing.key')).toBe('missing.key');
    });

    it('leaves unknown placeholders untouched', () => {
        expect(translate(dict, 'en', 'hi', {})).toBe('Hello {name}');
    });
});

describe('detectLanguage', () => {
    it('prefers a valid saved choice', () => {
        expect(detectLanguage('tr', 'en-US')).toBe('tr');
        expect(detectLanguage('en', 'tr-TR')).toBe('en');
    });

    it('follows the browser language otherwise', () => {
        expect(detectLanguage(null, 'tr-TR')).toBe('tr');
        expect(detectLanguage(null, 'tr')).toBe('tr');
        expect(detectLanguage('de', 'fr-FR')).toBe('en');
        expect(detectLanguage(undefined, undefined)).toBe('en');
    });

    it('knows the supported languages', () => {
        expect(isSupported('tr')).toBe(true);
        expect(isSupported('de')).toBe(false);
    });
});

describe('localized', () => {
    it('picks the language, falls back to English, passes strings through', () => {
        expect(localized({ en: 'Hi', tr: 'Selam' }, 'tr')).toBe('Selam');
        expect(localized({ en: 'Hi' }, 'tr')).toBe('Hi');
        expect(localized('plain', 'tr')).toBe('plain');
        expect(localized(undefined, 'en')).toBe('');
    });
});

describe('Clippy tips', () => {
    it('cover the same categories in both languages, each with at least one tip', () => {
        expect(Object.keys(CLIPPY_TIPS.tr).sort()).toEqual(Object.keys(CLIPPY_TIPS.en).sort());
        for (const lang of ['en', 'tr']) {
            for (const [category, tips] of Object.entries(CLIPPY_TIPS[lang])) {
                // `discover` is an object (one nudge per app); every other category is a list of tips
                const size = Array.isArray(tips) ? tips.length : Object.keys(tips).length;
                expect(size, `${lang}:${category}`).toBeGreaterThan(0);
            }
        }
    });
});
