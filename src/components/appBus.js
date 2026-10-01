// Lets any window ask the desktop to open (or focus) an app by its window id,
// e.g. the Welcome window's "Open resume" button.
export const OPEN_APP_EVENT = 'os-open-app';

export const openApp = (id) => {
    window.dispatchEvent(new CustomEvent(OPEN_APP_EVENT, { detail: { id } }));
};
