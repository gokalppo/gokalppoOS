// A random, anonymous "device mark" kept in this browser (localStorage plus a first-party cookie).
// It is only used so that when an admin bans someone, creating a fresh guest or account on the same browser does
// not undo the ban. It is not a fingerprint: it holds no information about the device, and clearing the site's
// data removes it (so it stops casual ban-dodging, not a determined person).
const STORAGE_KEY = 'gokalppoOS_deviceId';
const COOKIE_NAME = 'gokalppo_did';
const ID_PATTERN = /^[a-f0-9]{32}$/;

export const isValidDeviceId = (value) => typeof value === 'string' && ID_PATTERN.test(value);

const readCookie = (doc) => {
    try {
        const match = String(doc?.cookie || '').split(';').map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_NAME}=`));
        return match ? match.slice(COOKIE_NAME.length + 1) : null;
    } catch {
        return null; // cookies blocked
    }
};

const randomId = (cryptoApi) => {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const getDeviceId = (env = {}) => {
    const storage = env.storage ?? (typeof window !== 'undefined' ? window.localStorage : null);
    const doc = env.document ?? (typeof document !== 'undefined' ? document : null);
    const cryptoApi = env.crypto ?? globalThis.crypto;

    let id = null;
    try {
        const stored = storage?.getItem(STORAGE_KEY);
        if (isValidDeviceId(stored)) id = stored;
    } catch { /* storage blocked */ }
    if (!id) {
        const fromCookie = readCookie(doc);
        if (isValidDeviceId(fromCookie)) id = fromCookie;
    }
    if (!id) id = randomId(cryptoApi);

    // Keep both copies in step, so clearing only one of them does not lose the mark.
    try { storage?.setItem(STORAGE_KEY, id); } catch { /* storage blocked */ }
    try {
        if (doc) {
            const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
            doc.cookie = `${COOKIE_NAME}=${id}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
        }
    } catch { /* cookies blocked */ }
    return id;
};
