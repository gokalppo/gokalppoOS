// What Gökalp Bot remembers about a returning visitor, stored only in this browser.
const KEY = 'gokalppoOS_botMemory';

export const loadBotMemory = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        return {
            name: typeof saved?.name === 'string' ? saved.name.slice(0, 30) : null,
            visits: Number.isFinite(saved?.visits) ? saved.visits : 0
        };
    } catch {
        return { name: null, visits: 0 };
    }
};

export const saveBotMemory = (memory) => {
    try {
        localStorage.setItem(KEY, JSON.stringify({ name: memory.name || null, visits: memory.visits || 0 }));
    } catch {
        // memory just will not survive a reload
    }
};
