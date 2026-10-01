// The list of launchable apps, published by the Desktop so other windows (e.g. the Terminal's `ls`)
// always show what is really installed instead of a hard-coded copy.
let programs = [];

export const setPrograms = (list) => {
    programs = list.map(({ id, title }) => ({ id, title }));
};

export const getPrograms = () => programs;
