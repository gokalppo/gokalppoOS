// Helpers for the admin Inbox (messages visitors left through Gökalp Bot or the Outlook Express form).

// 'bot' for messages left through Gökalp Bot, 'form' for everything else (the Outlook Express form).
export const sourceOf = (entry) => (entry && entry.sentVia === 'gokalp-bot' ? 'bot' : 'form');

// Newest first. Entries are { id, ...fields } as stored in `outbox`.
export const entriesFromSnapshot = (value) => Object.entries(value || {})
    .filter(([, e]) => e && typeof e === 'object')
    .map(([id, e]) => ({ id, ...e }))
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

export const unreadCount = (entries) => entries.filter((e) => !e.readAt).length;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

// The address a reply should go to, if the sender left one.
export const replyAddress = (entry) => {
    const found = String(entry?.from ?? '').match(EMAIL_RE);
    return found ? found[0] : null;
};

export const replyHref = (entry) => {
    const address = replyAddress(entry);
    if (!address) return null;
    const subject = /^re:/i.test(entry.subject || '') ? entry.subject : `Re: ${entry.subject || ''}`;
    return `mailto:${address}?subject=${encodeURIComponent(subject.trim())}`;
};

export const filterEntries = (entries, filter) => {
    if (filter === 'unread') return entries.filter((e) => !e.readAt);
    if (filter === 'bot') return entries.filter((e) => sourceOf(e) === 'bot');
    if (filter === 'form') return entries.filter((e) => sourceOf(e) === 'form');
    return entries;
};
