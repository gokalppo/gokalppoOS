// Pure geometry / ordering helpers for the window manager.

export const TASKBAR_HEIGHT = 30;
export const DEFAULT_WINDOW = { width: 450, height: 350, minWidth: 260, minHeight: 160 };
export const RESIZE_HANDLES = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

// "480px" | 480 | undefined -> 480 | undefined
export const parsePx = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const n = parseFloat(value);
        if (Number.isFinite(n) && /^\s*-?\d+(\.\d+)?\s*(px)?\s*$/.test(value)) return n;
    }
    return undefined;
};

// Resolve a window's starting size from its options, never larger than the desktop.
export const resolveInitialSize = (options, viewport) => {
    const maxW = Math.max(viewport.width - 20, 200);
    const maxH = Math.max(viewport.height - TASKBAR_HEIGHT - 20, 150);
    const width = Math.min(parsePx(options.width) ?? DEFAULT_WINDOW.width, maxW);
    const height = Math.min(parsePx(options.height) ?? DEFAULT_WINDOW.height, maxH);
    const minWidth = Math.min(parsePx(options.minWidth) ?? DEFAULT_WINDOW.minWidth, width);
    const minHeight = Math.min(parsePx(options.minHeight) ?? DEFAULT_WINDOW.minHeight, height);
    return { width, height, minWidth, minHeight };
};

// Staggered start position so new windows don't stack exactly on top of each other.
export const cascadePosition = (size, viewport, index) => {
    const step = 28;
    const offset = (index % 6) * step;
    const x = (viewport.width - size.width) / 2 - 60 + offset;
    const y = (viewport.height - TASKBAR_HEIGHT - size.height) / 2 - 40 + offset;
    return {
        x: Math.round(clamp(x, 0, Math.max(viewport.width - size.width, 0))),
        y: Math.round(clamp(y, 0, Math.max(viewport.height - TASKBAR_HEIGHT - size.height, 0)))
    };
};

// Window rect after dragging `handle` by (dx, dy) from `start` ({x,y,width,height}).
// The opposite edge stays put; the window is kept inside the desktop.
export const computeResize = (handle, start, dx, dy, min, viewport) => {
    const bottomLimit = viewport.height - TASKBAR_HEIGHT;
    let { x, y, width, height } = start;

    if (handle.includes('e')) {
        width = clamp(start.width + dx, min.width, viewport.width - start.x);
    }
    if (handle.includes('s')) {
        height = clamp(start.height + dy, min.height, bottomLimit - start.y);
    }
    if (handle.includes('w')) {
        const right = start.x + start.width;
        width = clamp(start.width - dx, min.width, right);
        x = right - width;
    }
    if (handle.includes('n')) {
        const bottom = start.y + start.height;
        height = clamp(start.height - dy, min.height, bottom);
        y = bottom - height;
    }
    return { x, y, width, height };
};

const visibleWindows = (windows) => windows.filter((w) => !w.isClosing);

// Task-switcher order: most recently used (highest z-index) first.
export const switcherOrder = (windows) =>
    [...visibleWindows(windows)].sort((a, b) => b.zIndex - a.zIndex);

export const nextSwitcherIndex = (current, length, direction = 1) => {
    if (length <= 0) return 0;
    return (current + direction + length) % length;
};

// After minimizing `id`, focus the top-most remaining un-minimized window.
export const nextFocusAfterMinimize = (windows, id) => {
    const candidates = visibleWindows(windows).filter((w) => w.id !== id && !w.isMinimized);
    if (candidates.length === 0) return null;
    return candidates.reduce((top, w) => (w.zIndex > top.zIndex ? w : top)).id;
};
