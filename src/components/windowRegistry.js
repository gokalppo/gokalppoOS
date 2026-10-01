// The list of open windows, published by App so the Terminal's tasklist/kill can see them.
let windows = [];

export const setWindows = (list) => {
    windows = list.map(({ id, title, isMinimized, isClosing }) => ({ id, title, isMinimized, isClosing }));
};

export const getWindows = () => windows;
