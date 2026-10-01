import { describe, it, expect, vi } from 'vitest';
import {
    fontString, textLines, lineHeightFor, drawText, fitContain, TEXT_SIZES, TEXT_FONTS, DEFAULT_TEXT_OPTIONS
} from './paintText';

const fakeCtx = () => ({ fillText: vi.fn() });

describe('fontString', () => {
    it('builds a CSS font from size, family and bold', () => {
        expect(fontString({ size: 24, family: 'mono', bold: true })).toBe(`bold 24px ${TEXT_FONTS.mono}`);
        expect(fontString({ size: 12, family: 'serif', bold: false })).toBe(`12px ${TEXT_FONTS.serif}`);
    });

    it('falls back to sans for an unknown family', () => {
        expect(fontString({ size: 16, family: 'comic', bold: false })).toBe(`16px ${TEXT_FONTS.sans}`);
    });

    it('offers sensible defaults', () => {
        expect(TEXT_SIZES).toContain(DEFAULT_TEXT_OPTIONS.size);
        expect(TEXT_FONTS[DEFAULT_TEXT_OPTIONS.family]).toBeDefined();
    });
});

describe('textLines', () => {
    it('splits on newlines, handling Windows line endings', () => {
        expect(textLines('a\nb\r\nc')).toEqual(['a', 'b', 'c']);
    });

    it('drops trailing blank lines but keeps blank lines in the middle', () => {
        expect(textLines('a\n\nb\n\n')).toEqual(['a', '', 'b']);
        expect(textLines('\n  \n')).toEqual([]);
        expect(textLines(undefined)).toEqual([]);
    });
});

describe('drawText', () => {
    it('draws each line below the previous one, in the chosen colour and font', () => {
        const ctx = fakeCtx();
        const drawn = drawText(ctx, { text: 'one\ntwo', x: 10, y: 20, color: '#ff0000', size: 20, family: 'sans', bold: true });
        expect(drawn).toBe(2);
        expect(ctx.fillText).toHaveBeenNthCalledWith(1, 'one', 10, 20);
        expect(ctx.fillText).toHaveBeenNthCalledWith(2, 'two', 10, 20 + lineHeightFor(20));
        expect(ctx.fillStyle).toBe('#ff0000');
        expect(ctx.font).toBe(`bold 20px ${TEXT_FONTS.sans}`);
        expect(ctx.textBaseline).toBe('top');
    });

    it('draws nothing for empty text', () => {
        const ctx = fakeCtx();
        expect(drawText(ctx, { text: '  \n ', x: 0, y: 0, color: '#000', size: 16, family: 'sans', bold: false })).toBe(0);
        expect(ctx.fillText).not.toHaveBeenCalled();
    });
});

describe('fitContain', () => {
    it('centres an image that already fits, without enlarging it', () => {
        expect(fitContain(100, 50, 700, 480)).toEqual({ x: 300, y: 215, width: 100, height: 50 });
    });

    it('scales a larger image down to fit, keeping its proportions', () => {
        const fit = fitContain(1400, 480, 700, 480);
        expect(fit.width).toBe(700);
        expect(fit.height).toBe(240);
        expect(fit.x).toBe(0);
    });

    it('handles degenerate sizes', () => {
        expect(fitContain(0, 0, 700, 480)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });
});
