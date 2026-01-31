import { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import StartMenu from './StartMenu';
import './Taskbar.css';
import startIcon from '../assets/images/windows.png';
import loudIcon from '../assets/images/loud.png';
import mutedIcon from '../assets/images/muted.png';

const Taskbar = ({
    windows,
    activeWindowId,
    onToggleWindow,
    onCloseWindow,
    onOpenWindow,
    isStartOpen = false,
    toggleStart = () => console.warn("toggleStart prop missing"),
    onShutdown // Add this prop
}) => {
    const { volume, setGlobalVolume } = useOS(); // Use Audio Driver
    const [time, setTime] = useState(new Date());
    const [contextMenu, setContextMenu] = useState(null); // { x, y, windowId }
    const [isVolumeOpen, setIsVolumeOpen] = useState(false);
    const [flashingWindows, setFlashingWindows] = useState(new Set());

    // Convert 0-1 range to 0-100 for slider
    const volumePercent = Math.round(volume * 100);
    const lastVolumeRef = useRef(0.5); // Default to 50% for restore

    // If volume > 0, update lastVolumeRef
    useEffect(() => {
        if (volume > 0) {
            lastVolumeRef.current = volume;
        }
    }, [volume]);

    useEffect(() => {
        const handleFlash = (e) => {
            const { appId } = e.detail;
            if (activeWindowId !== appId) {
                setFlashingWindows(prev => {
                    const newSet = new Set(prev);
                    newSet.add(appId);
                    return newSet;
                });
            }
        };
        window.addEventListener('flash-taskbar', handleFlash);
        return () => window.removeEventListener('flash-taskbar', handleFlash);
    }, [activeWindowId]);

    useEffect(() => {
        if (activeWindowId) {
            setFlashingWindows(prev => {
                const newSet = new Set(prev);
                newSet.delete(activeWindowId);
                return newSet;
            });
        }
    }, [activeWindowId]);

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Outside Click Handling
    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(null);
            if (isStartOpen) toggleStart(); // Close if open
            setIsVolumeOpen(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [isStartOpen, toggleStart]);

    const handleStartClick = (e) => {
        e.stopPropagation();
        toggleStart();
        setIsVolumeOpen(false);
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const toggleFullScreen = (e) => {
        e.stopPropagation();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(err => console.error(err));
            }
        }
    };

    const toggleVolume = (e) => {
        e.stopPropagation();
        setIsVolumeOpen(!isVolumeOpen);
        if (isStartOpen) toggleStart();
    };

    const handleVolumeChange = (e) => {
        const newVolume = parseInt(e.target.value) / 100; // Convert 0-100 to 0-1
        setGlobalVolume(newVolume);
    };

    const handleMuteChange = (e) => {
        e.stopPropagation();
        if (volume > 0) {
            // Muting
            lastVolumeRef.current = volume;
            setGlobalVolume(0);
        } else {
            // Unmuting - Restore last known good volume (default 0.5 if none)
            const restoreVol = lastVolumeRef.current > 0 ? lastVolumeRef.current : 0.5;
            setGlobalVolume(restoreVol);
        }
    };

    const handleContextMenu = (e, windowId) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY - 40, windowId });
    };

    const handleCloseFromMenu = (e) => {
        e.stopPropagation();
        if (contextMenu) {
            onCloseWindow(contextMenu.windowId);
            setContextMenu(null);
        }
    };

    return (
        <>
            <StartMenu
                isOpen={isStartOpen}
                onClose={() => toggleStart()}
                onLaunch={onOpenWindow}
                onShutdown={onShutdown}
            />

            {contextMenu && (
                <div
                    className="taskbar-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="taskbar-context-item" onClick={handleCloseFromMenu}>Close</div>
                </div>
            )}

            {/* Volume Panel */}
            {isVolumeOpen && (
                <div className="volume-panel" onClick={(e) => e.stopPropagation()}>
                    <div className="volume-title">Volume</div>
                    <div className="volume-content-row">
                        {/* Volume Ramp Graphic */}
                        <div className="volume-ramp">
                            <svg width="20" height="100">
                                <line x1="5" y1="90" x2="20" y2="10" stroke="black" strokeWidth="1" />
                                <line x1="5" y1="90" x2="20" y2="90" stroke="black" strokeWidth="1" />
                                <line x1="20" y1="10" x2="20" y2="90" stroke="black" strokeWidth="1" />
                            </svg>
                        </div>

                        <div className="volume-slider-container">
                            <div className="volume-track-bg"></div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volumePercent}
                                onChange={handleVolumeChange}
                                className="volume-slider"
                            />
                        </div>
                    </div>

                    <div className="volume-mute-container">
                        <input
                            type="checkbox"
                            id="mute-check"
                            checked={volume === 0}
                            onChange={handleMuteChange}
                        />
                        <label htmlFor="mute-check">Mute</label>
                    </div>
                </div>
            )}

            <div className="taskbar" onClick={(e) => e.stopPropagation()}>
                <button
                    className={`start-button ${isStartOpen ? 'active' : ''}`}
                    onClick={handleStartClick}
                >
                    <img
                        src={startIcon}
                        alt="Start"
                        className="start-icon"
                        style={{ width: '16px', marginRight: '4px' }}
                        draggable={false}
                    />
                    Start
                </button>
                <div className="task-area">
                    {windows.map((win) => (
                        <button
                            key={win.id}
                            className={`task-tab ${activeWindowId === win.id && !win.isMinimized ? 'active' : ''} ${flashingWindows.has(win.id) ? 'flashing' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggleWindow(win.id); }}
                            onContextMenu={(e) => handleContextMenu(e, win.id)}
                        >
                            <span className="task-tab-text">{win.title}</span>
                        </button>
                    ))}
                </div>
                <div className="tray-area">
                    <div className={`tray-icon ${isVolumeOpen ? 'active' : ''}`} onClick={toggleVolume} title="Volume">
                        <img
                            src={volumePercent === 0 ? mutedIcon : loudIcon}
                            alt="Volume"
                            style={{ width: '16px', height: '16px' }}
                        />
                    </div>
                    <div className="tray-icon" onClick={toggleFullScreen} title="Full Screen">🖥️</div>
                    <div className="tray-clock">{formatTime(time)}</div>
                </div>
            </div>
        </>
    );
};

export default Taskbar;
