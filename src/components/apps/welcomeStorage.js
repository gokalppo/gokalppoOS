export const WELCOME_HIDDEN_KEY = 'gokalppoOS_welcomeHidden';

export const isWelcomeHidden = (storage = window.localStorage) => {
    try {
        return storage.getItem(WELCOME_HIDDEN_KEY) === '1';
    } catch {
        return false;
    }
};

export const setWelcomeHidden = (hidden, storage = window.localStorage) => {
    try {
        if (hidden) storage.setItem(WELCOME_HIDDEN_KEY, '1');
        else storage.removeItem(WELCOME_HIDDEN_KEY);
    } catch {
        // Storage unavailable — the choice just won't persist.
    }
};
