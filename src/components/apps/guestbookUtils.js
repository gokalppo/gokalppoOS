// Pure helpers for the Guestbook (validation, cooldown, ordering).

export const NAME_MAX = 30;
export const MESSAGE_MAX = 280;
export const POST_COOLDOWN_MS = 30000;
export const VISIBLE_ENTRIES = 50;

const squash = (text) => String(text ?? '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const normalizeEntry = ({ name, message }) => ({
    name: String(name ?? '').replace(/\s+/g, ' ').trim(),
    message: squash(message)
});

// Returns error codes (translated by the UI); empty array means valid.
export const validateEntry = (entry) => {
    const { name, message } = normalizeEntry(entry);
    const errors = [];
    if (name.length < 1) errors.push('nameRequired');
    if (name.length > NAME_MAX) errors.push('nameTooLong');
    if (message.length < 1) errors.push('messageRequired');
    if (message.length > MESSAGE_MAX) errors.push('messageTooLong');
    return errors;
};

export const cooldownRemainingMs = (lastPostAt, now) => {
    if (!lastPostAt) return 0;
    return Math.max(0, POST_COOLDOWN_MS - (now - lastPostAt));
};

// Firebase snapshot ({id: entry}) -> newest first, keeping the id.
export const entriesFromSnapshot = (data) =>
    Object.entries(data || {})
        .map(([id, entry]) => ({ id, ...entry }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
