// Turns plain chat text into [{ type: 'text' | 'link' | 'email', value, href? }] so URLs and e-mail
// addresses can be clickable. Only http(s) links and mailto: ever become links.
const PATTERN = /(https?:\/\/[^\s<>"']*[^\s<>"'.,;:!?)\]]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

export const linkify = (text) => {
    const source = String(text ?? '');
    const parts = [];
    let last = 0;
    for (const match of source.matchAll(PATTERN)) {
        const value = match[0];
        if (match.index > last) parts.push({ type: 'text', value: source.slice(last, match.index) });
        parts.push(value.includes('@') && !/^https?:/i.test(value)
            ? { type: 'email', value, href: `mailto:${value}` }
            : { type: 'link', value, href: value });
        last = match.index + value.length;
    }
    if (last < source.length) parts.push({ type: 'text', value: source.slice(last) });
    return parts;
};
