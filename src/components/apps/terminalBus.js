// Lets other parts of the OS (e.g. the Run dialog) hand a command to the Terminal,
// even before its window has finished loading.
let pending = [];
const listeners = new Set();

export const queueTerminalCommand = (command) => {
    if (listeners.size === 0) pending.push(command);
    else listeners.forEach((listener) => listener(command));
};

// Returns an unsubscribe function; commands queued earlier are delivered immediately.
export const subscribeTerminal = (listener) => {
    listeners.add(listener);
    const waiting = pending;
    pending = [];
    waiting.forEach(listener);
    return () => listeners.delete(listener);
};

export const _resetTerminalBus = () => { pending = []; listeners.clear(); };
