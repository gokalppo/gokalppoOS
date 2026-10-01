import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { DEFAULT_DISPLAY, loadDisplay, saveDisplay, normalizeDisplay, schemeCssVars } from '../display/displayConfig';

const DisplayContext = createContext({
    display: DEFAULT_DISPLAY,
    applyDisplay: () => { }
});

export const useDisplay = () => useContext(DisplayContext);

export const DisplayProvider = ({ children }) => {
    const [display, setDisplay] = useState(() => loadDisplay());

    const applyDisplay = useCallback((changes) => {
        setDisplay((prev) => {
            const next = normalizeDisplay({ ...prev, ...changes });
            saveDisplay(next);
            return next;
        });
    }, []);

    // Colour scheme -> CSS variables on <html>.
    useEffect(() => {
        const root = document.documentElement;
        for (const [name, value] of Object.entries(schemeCssVars(display.scheme))) {
            root.style.setProperty(name, value);
        }
    }, [display.scheme]);

    const value = useMemo(() => ({ display, applyDisplay }), [display, applyDisplay]);
    return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
};
