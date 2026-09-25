import { createContext, useState, useContext, useCallback, useEffect } from 'react';

const OSContext = createContext();

export const useOS = () => useContext(OSContext);

export const OSProvider = ({ children }) => {
    // --- Audio Driver (Global Volume) ---
    const [volume, setVolumeState] = useState(() => {
        const saved = localStorage.getItem('gokalppoOS_volume');
        return saved !== null ? parseFloat(saved) : 0.5;
    });

    const setGlobalVolume = useCallback((newVol) => {
        setVolumeState(newVol);
        localStorage.setItem('gokalppoOS_volume', newVol.toString());
    }, []);

    // Real windows live in App.jsx's state; apps ask for a close via this
    // event so they don't need the window-management props threaded down to them.
    const closeWindow = useCallback((id) => {
        window.dispatchEvent(new CustomEvent('os-close-window', { detail: { id } }));
    }, []);

    return (
        <OSContext.Provider
            value={{
                closeWindow,
                volume,
                setGlobalVolume
            }}
        >
            {children}
        </OSContext.Provider>
    );
};
