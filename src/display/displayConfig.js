// Display settings: wallpaper, colour scheme and screen saver (pure, unit-tested).

export const DISPLAY_STORAGE_KEY = 'gokalppoOS_display';

export const WALLPAPER_IDS = ['starfield', 'win98', 'bliss', 'teal'];
export const SAVER_IDS = ['starfield', 'mystify', 'none'];
export const SAVER_MINUTES = [1, 2, 5, 10];

export const DEFAULT_DISPLAY = {
    wallpaper: 'starfield',
    scheme: 'standard',
    saver: 'starfield',
    saverMinutes: 2
};

// Colour schemes inspired by the Win98 appearance presets.
export const SCHEMES = {
    standard: {
        face: '#c0c0c0', titleFrom: '#000080', titleTo: '#1084d0',
        inactiveFrom: '#808080', inactiveTo: '#b5b5b5', highlight: '#000080', desktop: '#008080'
    },
    rainy: {
        face: '#bfc7cf', titleFrom: '#1c3a5a', titleTo: '#6a8fb0',
        inactiveFrom: '#707880', inactiveTo: '#a8b4c0', highlight: '#1c3a5a', desktop: '#5b6f82'
    },
    hotdog: {
        face: '#ffe800', titleFrom: '#d00000', titleTo: '#d00000',
        inactiveFrom: '#805000', inactiveTo: '#805000', highlight: '#c00000', desktop: '#c80000'
    },
    eggplant: {
        face: '#d8c8e0', titleFrom: '#400040', titleTo: '#9060a0',
        inactiveFrom: '#706070', inactiveTo: '#b8a8c0', highlight: '#600060', desktop: '#402040'
    },
    desert: {
        face: '#e0d0a8', titleFrom: '#804000', titleTo: '#c08040',
        inactiveFrom: '#807860', inactiveTo: '#c0b898', highlight: '#804000', desktop: '#a07850'
    }
};

export const SCHEME_IDS = Object.keys(SCHEMES);

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

// Anything read from storage is untrusted: fall back to defaults for unknown values.
export const normalizeDisplay = (raw) => {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
        wallpaper: pick(src.wallpaper, WALLPAPER_IDS, DEFAULT_DISPLAY.wallpaper),
        scheme: pick(src.scheme, SCHEME_IDS, DEFAULT_DISPLAY.scheme),
        saver: pick(src.saver, SAVER_IDS, DEFAULT_DISPLAY.saver),
        saverMinutes: pick(src.saverMinutes, SAVER_MINUTES, DEFAULT_DISPLAY.saverMinutes)
    };
};

export const loadDisplay = (storage = window.localStorage) => {
    try {
        return normalizeDisplay(JSON.parse(storage.getItem(DISPLAY_STORAGE_KEY)));
    } catch {
        return { ...DEFAULT_DISPLAY };
    }
};

export const saveDisplay = (display, storage = window.localStorage) => {
    try {
        storage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(normalizeDisplay(display)));
    } catch {
        // Storage unavailable — the choice just won't persist.
    }
};

// CSS custom properties to set on <html> for a scheme.
export const schemeCssVars = (schemeId) => {
    const s = SCHEMES[schemeId] || SCHEMES.standard;
    return {
        '--win-gray': s.face,
        '--title-from': s.titleFrom,
        '--title-to': s.titleTo,
        '--title-inactive-from': s.inactiveFrom,
        '--title-inactive-to': s.inactiveTo,
        '--win-highlight': s.highlight,
        '--os-bg': s.desktop
    };
};

export const saverDelayMs = (minutes) => minutes * 60 * 1000;
