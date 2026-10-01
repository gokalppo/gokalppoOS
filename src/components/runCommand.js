// Resolves what the Start > Run... box should do with the text you type (pure).

// Classic Win98 names / file names -> our program ids.
const ALIASES = {
    cmd: 'terminal', command: 'terminal', msdos: 'terminal', console: 'terminal',
    iexplore: 'internetexplorer', ie: 'internetexplorer', browser: 'internetexplorer',
    mspaint: 'paint', pbrush: 'paint',
    winmine: 'minesweeper', mines: 'minesweeper',
    sol: 'solitaire', cards: 'solitaire',
    explorer: 'mycomputer', computer: 'mycomputer', 'my-computer': 'mycomputer',
    msnmsgr: 'messenger', msn: 'messenger',
    mplayer: 'musicplayer', mplayer2: 'musicplayer', music: 'musicplayer',
    notepad: 'notepad', wordpad: 'notepad',
    'desk.cpl': 'displayproperties', display: 'displayproperties', 'control': 'displayproperties',
    'sysdm.cpl': 'systemproperties', system: 'systemproperties',
    book: 'guestbook', resume: 'myresume', cv: 'myresume', about: 'aboutme', tour: 'welcome', welcome: 'welcome'
};

const stripExtension = (name) => name.replace(/\.(exe|com|bat|cpl)$/i, (m) => (m.toLowerCase() === '.cpl' ? m : ''));

export const normalizeRunInput = (input) =>
    stripExtension(String(input ?? '').trim().toLowerCase());

// Result: { type: 'empty' } | { type: 'program', id } | { type: 'url', url } | { type: 'terminal', command }
export const resolveRunCommand = (input, programIds) => {
    const raw = String(input ?? '').trim();
    if (!raw) return { type: 'empty' };

    if (/^https?:\/\//i.test(raw)) return { type: 'url', url: raw };

    const normalized = normalizeRunInput(raw);
    const compact = normalized.replace(/\s+/g, '');
    const candidates = [normalized, compact];

    for (const candidate of candidates) {
        if (programIds.includes(candidate)) return { type: 'program', id: candidate };
        if (ALIASES[candidate] && programIds.includes(ALIASES[candidate])) {
            return { type: 'program', id: ALIASES[candidate] };
        }
    }

    // Anything else is treated as a Terminal command (so "help", "neofetch" ... just work).
    return { type: 'terminal', command: raw };
};
