// Navigation logic for the Internet Explorer window (pure, unit-tested).

import { PROJECTS } from '../../data/projects';

export const SCHEME = 'gokalppo://';
export const HOME = 'home';

export const EXTERNAL_LINKS = [
    { id: 'github', label: 'GitHub', url: 'https://github.com/gokalppo' },
    { id: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/gokalp-eker/' },
    { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/_gokalpeker/' },
    { id: 'site-source', label: 'This site\'s source code', url: 'https://github.com/gokalppo/gokalppoOS' },
    { id: 'resume', label: 'Resume (PDF)', url: '/resume.pdf' },
    { id: 'email', label: 'Email', url: 'mailto:ekergokalp@gmail.com' }
];

const TOP_LEVEL = ['home', 'about', 'projects', 'links'];

export const toAddress = (path) => `${SCHEME}${path}`;

export const isKnownPath = (path) => {
    if (TOP_LEVEL.includes(path)) return true;
    const match = path.match(/^projects\/([a-z0-9-]+)$/);
    return Boolean(match && PROJECTS.some((p) => p.slug === match[1]));
};

// Turns whatever the user typed into a navigation target.
//  - "projects", "gokalppo://projects/cindranet", "/about"  -> internal page
//  - "https://example.com"                                  -> external (opens a new tab)
//  - "example.com"                                          -> external with https://
export const resolveAddress = (input) => {
    const raw = String(input ?? '').trim();
    if (!raw) return { type: 'internal', path: HOME };

    if (/^https?:\/\//i.test(raw)) return { type: 'external', url: raw };

    const internal = raw
        .replace(/^gokalppo:\/\//i, '')
        .replace(/^\/+|\/+$/g, '')
        .toLowerCase();
    if (!internal) return { type: 'internal', path: HOME };
    if (isKnownPath(internal)) return { type: 'internal', path: internal };

    // Looks like a hostname ("example.com", "sub.site.org/path")?
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(raw)) return { type: 'external', url: `https://${raw}` };

    return { type: 'internal', path: internal, missing: true };
};

// Browser-style history: { entries: [path], index }.
export const initialHistory = (path = HOME) => ({ entries: [path], index: 0 });

export const navigate = (history, path) => {
    if (history.entries[history.index] === path) return history;
    const entries = [...history.entries.slice(0, history.index + 1), path];
    return { entries, index: entries.length - 1 };
};

export const back = (history) => (history.index > 0 ? { ...history, index: history.index - 1 } : history);
export const forward = (history) =>
    (history.index < history.entries.length - 1 ? { ...history, index: history.index + 1 } : history);

export const canGoBack = (history) => history.index > 0;
export const canGoForward = (history) => history.index < history.entries.length - 1;
export const currentPath = (history) => history.entries[history.index];
