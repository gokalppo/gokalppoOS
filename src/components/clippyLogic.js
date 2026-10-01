// Clippy's picking logic, kept free of React so it can be tested: a "tip bag" that shows every tip
// of a group once before any repeats (and never the same tip twice in a row), and the choice of
// which app to nudge the visitor towards after a quiet spell.

// Always shows each tip of a pool once (in random order) before reshuffling.
export const createTipBag = (random = Math.random) => {
    const bags = new Map(); // pool key -> tips still to show
    const lastShown = new Map();

    const shuffle = (list) => {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    // key identifies the pool (language + category), pool is the list of tips
    const next = (key, pool) => {
        if (!pool || pool.length === 0) return '';
        if (pool.length === 1) return pool[0];
        let bag = bags.get(key);
        if (!bag || bag.length === 0) {
            bag = shuffle(pool);
            // do not start a fresh round with the tip that ended the last one
            if (bag[0] === lastShown.get(key)) bag.push(bag.shift());
        }
        const tip = bag.shift();
        bags.set(key, bag);
        lastShown.set(key, tip);
        return tip;
    };

    return { next };
};

// Apps worth nudging towards, in the order they are suggested.
export const DISCOVERY_ORDER = [
    'terminal', 'messenger', 'paint', 'notepad', 'gallery', 'guestbook', 'minesweeper', 'solitaire',
    'internetexplorer', 'aboutme', 'displayproperties', 'systemproperties', 'myresume', 'contact', 'musicplayer'
];

// The first app the visitor has not opened yet, or null once they have seen them all.
export const nextDiscovery = (visited, tips) => DISCOVERY_ORDER.find((id) => !visited.has(id) && tips.discover && tips.discover[id]) || null;
