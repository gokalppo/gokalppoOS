// Lets any window ask the desktop to open (or focus) an app by its window id,
// e.g. the Welcome window's "Open resume" button.
export const OPEN_APP_EVENT = 'os-open-app';

export const openApp = (id) => {
    window.dispatchEvent(new CustomEvent(OPEN_APP_EVENT, { detail: { id } }));
};

// Open a file from the virtual file system in its program (Notepad for text, Paint for pictures).
export const OPEN_FILE_EVENT = 'os-open-file';

export const openFile = (node) => {
    window.dispatchEvent(new CustomEvent(OPEN_FILE_EVENT, { detail: { id: node.id, name: node.name } }));
};

// Close an open window by its id (the Terminal's `kill`).
export const CLOSE_APP_EVENT = 'os-close-app';

export const closeApp = (id) => {
    window.dispatchEvent(new CustomEvent(CLOSE_APP_EVENT, { detail: { id } }));
};
