// Command history for the Terminal's Up/Down keys. Pure and unit-tested.
export const HISTORY_LIMIT = 100;

// Adds a command, skipping blanks and immediate repeats.
export const pushHistory = (list, command, limit = HISTORY_LIMIT) => {
    const cmd = String(command ?? '').trim();
    if (!cmd || list[list.length - 1] === cmd) return list;
    return [...list, cmd].slice(-limit);
};

// index === list.length means "the line being typed" (the draft).
export const stepHistory = ({ list, index, direction, draft, current }) => {
    if (!list.length) return { index, input: current, draft };
    const atEnd = index >= list.length;
    const savedDraft = atEnd ? current : draft;
    if (direction === 'up') {
        const next = Math.max(0, (atEnd ? list.length : index) - 1);
        return { index: next, input: list[next], draft: savedDraft };
    }
    if (atEnd) return { index, input: current, draft };
    const next = index + 1;
    return { index: next, input: next >= list.length ? savedDraft : list[next], draft: savedDraft };
};

export const formatHistory = (list) => list.map((cmd, i) => `${String(i + 1).padStart(4)}  ${cmd}`);
