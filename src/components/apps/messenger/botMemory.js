// What Gökalp Bot remembers about a returning visitor (name, visits, what they taught it), stored only in this browser.
const KEY = 'gokalppoOS_botMemory';

export const loadBotMemory = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        const taught = Array.isArray(saved?.taught)
            ? saved.taught.filter((t) => t && typeof t.q === 'string' && typeof t.a === 'string').slice(-100)
                .map((t) => ({ q: t.q.slice(0, 80), a: t.a.slice(0, 200), lang: t.lang === 'tr' ? 'tr' : 'en' }))
            : [];
        return {
            name: typeof saved?.name === 'string' ? saved.name.slice(0, 30) : null,
            visits: Number.isFinite(saved?.visits) ? saved.visits : 0,
            taught
        };
    } catch {
        return { name: null, visits: 0, taught: [] };
    }
};

export const saveBotMemory = (memory) => {
    try {
        localStorage.setItem(KEY, JSON.stringify({ name: memory.name || null, visits: memory.visits || 0, taught: memory.taught || [] }));
    } catch {
        // memory just will not survive a reload
    }
};
