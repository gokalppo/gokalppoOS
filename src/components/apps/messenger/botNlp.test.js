import { describe, it, expect } from 'vitest';
import { fold, tokenize, editDistance, tokenMatches, detectLanguage, normalizeText } from './botNlp';

describe('fold', () => {
    it('removes Turkish letters and capital İ', () => {
        expect(fold('İletişim Özgeçmiş ÇAĞRI şüğ ı')).toBe('iletisim ozgecmis cagri sug i');
    });

    it('turns c++ and c# into plain words', () => {
        expect(tokenize('Does he know C++ or C#?')).toEqual(['does', 'he', 'know', 'cpp', 'or', 'csharp']);
        expect(normalizeText("What's up, Gökalp's bot?")).toBe('what s up gokalp s bot');
    });
});

describe('tokenMatches', () => {
    it('matches exactly, with suffixes and with small typos on longer words', () => {
        expect(tokenMatches('projeler', 'proje')).toBe(true);
        expect(tokenMatches('projelerinden', 'proje')).toBe(true);
        expect(tokenMatches('linkedn', 'linkedin')).toBe(true);
        expect(tokenMatches('resum', 'resume')).toBe(true);
        expect(tokenMatches('projlr', 'projeler')).toBe(true);
    });

    it('does not match unrelated or very short words loosely', () => {
        expect(tokenMatches('hat', 'hi')).toBe(false);
        expect(tokenMatches('his', 'hi')).toBe(false);
        expect(tokenMatches('banana', 'project')).toBe(false);
        expect(tokenMatches('chat', 'cv')).toBe(false);
    });

    it('"=" means exact only', () => {
        expect(tokenMatches('helpful', '=help')).toBe(false);
        expect(tokenMatches('help', '=help')).toBe(true);
    });

    it('edit distance gives up early', () => {
        expect(editDistance('kitten', 'sitting', 3)).toBe(3);
        expect(editDistance('a', 'abcdefgh', 2)).toBe(3);
    });
});

describe('detectLanguage', () => {
    it('spots Turkish letters and common words in each language', () => {
        expect(detectLanguage('projelerini göster')).toBe('tr');
        expect(detectLanguage('nasil ulasirim')).toBe('tr');
        expect(detectLanguage('merhaba')).toBe('tr');
        expect(detectLanguage('show me the projects')).toBe('en');
        expect(detectLanguage('what can you do?')).toBe('en');
    });

    it('is unsure about ambiguous input', () => {
        expect(detectLanguage('demo')).toBeNull();
        expect(detectLanguage('')).toBeNull();
        expect(detectLanguage('😀')).toBeNull();
    });
});
