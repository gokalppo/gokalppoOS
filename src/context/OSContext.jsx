import { createContext, useState, useContext, useCallback, useEffect } from 'react';

const OSContext = createContext();

export const useOS = () => useContext(OSContext);

export const OSProvider = ({ children }) => {
    const [windows, setWindows] = useState([]);
    const [activeWindowId, setActiveWindowId] = useState(null);
    const [zIndexCounter, setZIndexCounter] = useState(100); // Start higher to be safe above icons

    // --- Audio Driver (Global Volume) ---
    const [volume, setVolumeState] = useState(() => {
        const saved = localStorage.getItem('gokalppoOS_volume');
        return saved !== null ? parseFloat(saved) : 0.5;
    });

    const setGlobalVolume = useCallback((newVol) => {
        setVolumeState(newVol);
        localStorage.setItem('gokalppoOS_volume', newVol.toString());
    }, []);

    const focusWindow = useCallback((id) => {
        setActiveWindowId(id);
        setZIndexCounter((prev) => prev + 1);
        setWindows((prev) =>
            prev.map((win) =>
                win.id === id ? { ...win, zIndex: zIndexCounter + 1, isMinimized: false } : win
            )
        );
    }, [zIndexCounter]);

    const openWindow = useCallback((id, title, content, initialPosition) => {
        // Default position if not provided, random offset to stack nicely
        const pos = initialPosition || { x: 50 + (Math.random() * 50), y: 50 + (Math.random() * 50) };

        setWindows((prev) => {
            const existing = prev.find((w) => w.id === id);
            if (existing) {
                // If exists, focus and restore
                // We need to call focusWindow effectively, but we can't call it inside setState
                // So we handle the update here locally
                return prev.map(w => w.id === id ? { ...w, zIndex: zIndexCounter + 1, isMinimized: false } : w);
            }

            const newZ = zIndexCounter + 1;
            return [...prev, {
                id,
                title,
                content,
                isMinimized: false,
                zIndex: newZ,
                position: pos
            }];
        });

        setActiveWindowId(id);
        setZIndexCounter(prev => prev + 1);
    }, [zIndexCounter]);

    const closeWindow = useCallback((id) => {
        setWindows((prev) => prev.filter((win) => win.id !== id));
        if (activeWindowId === id) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);

    const minimizeWindow = useCallback((id) => {
        setWindows((prev) =>
            prev.map((win) =>
                win.id === id ? { ...win, isMinimized: true } : win
            )
        );
        if (activeWindowId === id) {
            setActiveWindowId(null);
        }
    }, [activeWindowId]);

    const restoreWindow = useCallback((id) => {
        // Restore and focus
        const newZ = zIndexCounter + 1;
        setZIndexCounter(newZ);
        setWindows((prev) =>
            prev.map((win) =>
                win.id === id ? { ...win, isMinimized: false, zIndex: newZ } : win
            )
        );
        setActiveWindowId(id);
    }, [zIndexCounter]);

    const toggleWindow = useCallback((id) => {
        const win = windows.find(w => w.id === id);
        if (!win) return;

        if (win.isMinimized) {
            restoreWindow(id);
        } else if (activeWindowId === id) {
            minimizeWindow(id);
        } else {
            // If open but not focused (and not minimized), focus it
            focusWindow(id);
        }
    }, [windows, activeWindowId, restoreWindow, minimizeWindow, focusWindow]);

    return (
        <OSContext.Provider
            value={{
                windows,
                activeWindowId,
                openWindow,
                closeWindow,
                minimizeWindow,
                restoreWindow,
                focusWindow,
                toggleWindow,
                volume,
                setGlobalVolume
            }}
        >
            {children}
        </OSContext.Provider>
    );
};
