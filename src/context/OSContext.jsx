import { createContext, useState, useContext, useCallback } from 'react';
import { loadSoundsEnabled, saveSoundsEnabled, playSystemSound } from '../audio/systemSounds';

// Inert defaults so components also render in isolation (tests) without the provider.
const OSContext = createContext({
    closeWindow: () => { },
    volume: 0.5,
    setGlobalVolume: () => { },
    soundsEnabled: false,
    setSoundsEnabled: () => { },
    playSound: () => { }
});

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

    // --- System sounds (opt-in, off by default) ---
    const [soundsEnabled, setSoundsEnabledState] = useState(loadSoundsEnabled);

    const setSoundsEnabled = useCallback((enabled) => {
        setSoundsEnabledState(enabled);
        saveSoundsEnabled(enabled);
    }, []);

    const playSound = useCallback((name) => {
        if (soundsEnabled) playSystemSound(name, volume);
    }, [soundsEnabled, volume]);

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
                setGlobalVolume,
                soundsEnabled,
                setSoundsEnabled,
                playSound
            }}
        >
            {children}
        </OSContext.Provider>
    );
};
