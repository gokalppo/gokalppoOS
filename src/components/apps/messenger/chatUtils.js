// Pure helpers shared by the Messenger hooks and components.

// Wrapper so event handlers can read the clock without tripping the
// react-hooks/purity lint rule (they never run during render).
export const nowMs = () => Date.now();

export const GLOBAL_ROOMS = ['global-1', 'global-2'];

export const EMOJIS = [
    { char: '😊', text: ':)' },
    { char: '😂', text: ':D' },
    { char: '😛', text: ':P' },
    { char: '😢', text: ':(' },
    { char: '😎', text: '8)' },
    { char: '😲', text: ':O' },
    { char: '❤️', text: '<3' },
    { char: '😡', text: '>:@' }
];

export const getPrivateRoomId = (uidA, uidB) => [uidA, uidB].sort().join('_');

// Database path of the message list for the current view, or null when no
// conversation is selected (private tab without a contact).
export const getMessagesPath = (currentRoom, activeContactId, uid) => {
    if (currentRoom === 'private') {
        return activeContactId ? `privateMessages/${getPrivateRoomId(uid, activeContactId)}` : null;
    }
    return `messages/${currentRoom}`;
};

export const censorText = (text) => text.replace(/(bad|evil|cursed)/gi, '***');

export const formatTime = (ts) => {
    if (!ts) return '';
    if (typeof ts === 'string') return ts;
    return new Date(ts).toLocaleTimeString('en-GB', {
        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

// Firebase snapshot value ({key: msg}) -> chronological array that keeps the key.
export const messagesFromSnapshot = (data) => {
    if (!data) return [];
    return Object.keys(data)
        .map((key) => ({ ...data[key], key }))
        .sort((a, b) => a.timestamp - b.timestamp);
};

export const requestsFromSnapshot = (data) =>
    data ? Object.keys(data).map((key) => ({ ...data[key], key })) : [];

// Admin panel: join public user records with their private (email) records.
export const mergeUsersWithPrivate = (users, privateData = {}) =>
    Object.entries(users).map(([uid, data]) => ({
        ...data,
        uid,
        email: privateData[uid]?.email
    }));

// Order in which a username lookup is attempted: exact string, numeric, lowercase.
export const buildUsernameCandidates = (rawInput) => {
    const candidates = [String(rawInput)];
    if (rawInput !== '' && !isNaN(rawInput)) candidates.push(Number(rawInput));
    if (rawInput.toLowerCase() !== rawInput) candidates.push(rawInput.toLowerCase());
    return [...new Set(candidates)];
};

export const DECLINE_COOLDOWN_MS = 3600000; // 1 hour

export const declineCooldownMinutesLeft = (declinedAt, now) => {
    const diff = now - declinedAt;
    return diff < DECLINE_COOLDOWN_MS ? Math.ceil((DECLINE_COOLDOWN_MS - diff) / 60000) : 0;
};
