// Anonymous app-open counters (no cookies, no IDs, no personal data).
// Each open of an app does `analytics/appOpens/{appId} += 1` in Realtime Database.
// Only an admin can read the totals (see database.rules.json / Messenger > Admin Tools).

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

// Respect Do Not Track and keep development traffic out of the numbers.
export const isTrackable = ({ doNotTrack, hostname }) => {
    if (doNotTrack === '1' || doNotTrack === 'yes') return false;
    return !LOCAL_HOSTS.includes(hostname);
};

// The only app ids that are counted. The database rules accept exactly this list (a test keeps the two in
// sync), so a stranger cannot fill the database with made-up counters, and file windows (named after the
// visitor's own file names) are never reported.
export const KNOWN_APPS = [
    'mycomputer', 'recyclebin', 'notepad', 'myresume', 'terminal', 'gallery', 'contact', 'minesweeper', 'musicplayer', 'paint',
    'internetexplorer', 'guestbook', 'solitaire', 'aboutme', 'messenger', 'systemproperties', 'displayproperties', 'welcome', 'documents'
];

// Database keys can't contain . $ # [ ] / — window ids are already simple, this is a guard.
export const sanitizeAppId = (id) =>
    String(id ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 40);

export const sortUsage = (counts) =>
    Object.entries(counts || {})
        .map(([app, opens]) => ({ app, opens }))
        .sort((a, b) => b.opens - a.opens || a.app.localeCompare(b.app));

export const trackAppOpen = async (appId, env = {
    doNotTrack: navigator.doNotTrack || window.doNotTrack,
    hostname: window.location.hostname
}) => {
    const id = sanitizeAppId(appId);
    if (!id || !KNOWN_APPS.includes(id) || !isTrackable(env)) return;
    try {
        // Loaded on demand so analytics never delays first paint.
        const [{ db }, { ref, update, increment }] = await Promise.all([
            import('../firebase'),
            import('firebase/database')
        ]);
        await update(ref(db, 'analytics/appOpens'), { [id]: increment(1) });
    } catch {
        // Analytics must never affect the user — drop silently.
    }
};
