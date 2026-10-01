// Hands a visitor's message for Gökalp over to the existing `outbox` (the same place the Outlook Express
// app writes to; its rules allow create-only writes and nobody can read it back).
export const BOT_INBOX_MIN_GAP_MS = 60000;
const LAST_SEND_KEY = 'gokalppoOS_botLastSend';
const INBOX_ADDRESS = 'gokalppoos@gmail.com';

// The record that is stored, shaped to fit the `outbox` validation rules (lengths, required fields).
export const buildOutboxEntry = ({ message, contact = '', name = '', lang = 'en' }, now = Date.now()) => {
    const cleanName = String(name).slice(0, 40);
    const cleanContact = String(contact).slice(0, 120);
    const footer = [
        '---',
        `Name: ${cleanName || '(not given)'}`,
        `Reply to: ${cleanContact || '(no reply address)'}`,
        `Language: ${lang}`,
        'Sent through Gökalp Bot on the portfolio.'
    ].join('\n');
    return {
        from: (cleanContact || cleanName || 'Gökalp Bot visitor').slice(0, 120),
        to: INBOX_ADDRESS,
        subject: `Message via Gökalp Bot${cleanName ? ` from ${cleanName}` : ''}`.slice(0, 200),
        body: `${String(message).slice(0, 1500)}\n\n${footer}`.slice(0, 5000),
        sentVia: 'gokalp-bot',
        timestamp: now
    };
};

const defaultSend = async (entry) => {
    const [{ ref, push }, { db }] = await Promise.all([import('firebase/database'), import('../../../firebase')]);
    await push(ref(db, 'outbox'), entry);
};

// Resolves to 'sent' or 'tooSoon' (one message per minute per visitor); rejects if the database refuses.
export const submitBotMessage = async (payload, { send = defaultSend, now = Date.now, storage } = {}) => {
    let store = storage;
    if (!store) {
        try { store = window.sessionStorage; } catch { store = null; }
    }
    const last = Number(store?.getItem(LAST_SEND_KEY) || 0);
    if (last && now() - last < BOT_INBOX_MIN_GAP_MS) return 'tooSoon';
    await send(buildOutboxEntry(payload, now()));
    try { store?.setItem(LAST_SEND_KEY, String(now())); } catch { /* the limit just will not be remembered */ }
    return 'sent';
};
