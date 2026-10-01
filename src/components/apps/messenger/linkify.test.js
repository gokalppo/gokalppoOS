import { describe, it, expect } from 'vitest';
import { linkify } from './linkify';

describe('linkify', () => {
    it('finds links and e-mail addresses and leaves the rest as text', () => {
        expect(linkify('Mail me: a.b@example.com or see https://github.com/gokalppo, thanks!')).toEqual([
            { type: 'text', value: 'Mail me: ' },
            { type: 'email', value: 'a.b@example.com', href: 'mailto:a.b@example.com' },
            { type: 'text', value: ' or see ' },
            { type: 'link', value: 'https://github.com/gokalppo', href: 'https://github.com/gokalppo' },
            { type: 'text', value: ', thanks!' }
        ]);
    });

    it('keeps trailing punctuation out of the link', () => {
        expect(linkify('(https://example.com/a?b=1).')[1]).toMatchObject({ value: 'https://example.com/a?b=1' });
    });

    it('never makes links out of javascript: or other schemes', () => {
        expect(linkify('click javascript:alert(1) or data:text/html,hi')).toEqual([
            { type: 'text', value: 'click javascript:alert(1) or data:text/html,hi' }
        ]);
    });

    it('handles empty input', () => {
        expect(linkify('')).toEqual([]);
        expect(linkify(undefined)).toEqual([]);
    });
});
