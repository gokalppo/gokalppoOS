import { describe, it, expect } from 'vitest';
import { extensionOf, fileKind, sanitizeFileName, ensureExtension, isImageDataUrl } from './fileTypes';

describe('fileKind', () => {
    it('recognises text and image files, ignoring case', () => {
        expect(fileKind('notes.txt')).toBe('text');
        expect(fileKind('NOTES.TXT')).toBe('text');
        for (const n of ['a.png', 'a.JPG', 'a.jpeg', 'a.gif', 'a.webp', 'a.bmp']) expect(fileKind(n), n).toBe('image');
    });

    it('treats everything else as other', () => {
        for (const n of ['a.exe', 'archive', 'a.png.exe', '', undefined]) expect(fileKind(n), String(n)).toBe('other');
    });

    it('extensionOf takes the last extension only', () => {
        expect(extensionOf('a.tar.GZ')).toBe('gz');
        expect(extensionOf('noext')).toBe('');
    });
});

describe('sanitizeFileName', () => {
    it('removes characters Windows forbids and tidies spaces', () => {
        expect(sanitizeFileName('a/b\\c:d*e?f"g<h>i|j')).toBe('abcdefghij');
        expect(sanitizeFileName('  my   file  ')).toBe('my file');
    });
});

describe('ensureExtension', () => {
    it('adds the extension only when it is missing', () => {
        expect(ensureExtension('notes', 'txt')).toBe('notes.txt');
        expect(ensureExtension('notes.TXT', 'txt')).toBe('notes.TXT');
        expect(ensureExtension('pic', 'png')).toBe('pic.png');
    });

    it('falls back to a default name for empty or fully-stripped input', () => {
        expect(ensureExtension('', 'txt')).toBe('Untitled.txt');
        expect(ensureExtension('///', 'png')).toBe('Untitled.png');
    });
});

describe('isImageDataUrl', () => {
    it('accepts base64 image data URLs only', () => {
        expect(isImageDataUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
        expect(isImageDataUrl('data:image/jpeg;base64,/9j/4AAQ')).toBe(true);
    });

    it('rejects anything else, including scripts and SVG', () => {
        for (const v of ['javascript:alert(1)', 'data:text/html;base64,PGI+', 'data:image/svg+xml;base64,PHN2Zz4=', 'http://x/y.png', '', null, 42]) {
            expect(isImageDataUrl(v), String(v)).toBe(false);
        }
    });
});
