import { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import StartMenu from './StartMenu';
import { playSystemSound } from '../audio/systemSounds';
import CalendarPopup from './CalendarPopup';
import './Taskbar.css';
import startIcon from '../assets/images/windows.png';
import loudIcon from '../assets/images/loud.png';
import mutedIcon from '../assets/images/muted.png';

const Taskbar = ({
    windows,
    activeWindowId,
    onToggleWindow,
    onShowDesktop,
    onCloseWindow,
    onOpenWindow,
    isStartOpen = false,
    toggleStart = () => console.warn("toggleStart prop missing"),
    onShutdown // Add this prop
}) => {
    const { volume, setGlobalVolume, soundsEnabled, setSoundsEnabled, playSound } = useOS(); // Use Audio Driver
    const [time, setTime] = useState(new Date());
    const [contextMenu, setContextMenu] = useState(null); // { x, y, windowId }
    const [isVolumeOpen, setIsVolumeOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
    const [visitorCount, setVisitorCount] = useState(null);
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

    // Focusing a window stops its taskbar flash (adjusted during render, not in an effect).
    const [lastActiveWindowId, setLastActiveWindowId] = useState(activeWindowId);
    if (lastActiveWindowId !== activeWindowId) {
        setLastActiveWindowId(activeWindowId);
        if (activeWindowId && flashingWindows.has(activeWindowId)) {
            const next = new Set(flashingWindows);
            next.delete(activeWindowId);
            setFlashingWindows(next);
        }
    }

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Connection status and the visitor count (broadcast by VisitorCounter) for the tray.
    useEffect(() => {
        const goOnline = () => setIsOnline(true);
        const goOffline = () => setIsOnline(false);
        const onVisitors = (e) => setVisitorCount(e.detail.count);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        window.addEventListener('visitor-count', onVisitors);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('visitor-count', onVisitors);
        };
    }, []);

    // Outside Click Handling
    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(null);
            if (isStartOpen) toggleStart(); // Close if open
            setIsVolumeOpen(false);
            setIsCalendarOpen(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [isStartOpen, toggleStart]);

    const handleStartClick = (e) => {
        e.stopPropagation();
        playSound('menu');
        toggleStart();
        setIsVolumeOpen(false);
        setIsCalendarOpen(false);
    };

    const toggleCalendar = (e) => {
        e.stopPropagation();
        setIsCalendarOpen(!isCalendarOpen);
        setIsVolumeOpen(false);
        if (isStartOpen) toggleStart();
    };

    const handleSoundsToggle = (e) => {
        const enabled = e.target.checked;
        setSoundsEnabled(enabled);
        if (enabled) playSystemSound('notify', volume || 0.5);
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
        setIsCalendarOpen(false);
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
                    <div className="volume-mute-container">
                        <input
                            type="checkbox"
                            id="system-sounds-check"
                            checked={soundsEnabled}
                            onChange={handleSoundsToggle}
                        />
                        <label htmlFor="system-sounds-check">System sounds</label>
                    </div>
                </div>
            )}

            {isCalendarOpen && <CalendarPopup now={time} />}

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
                <button className="show-desktop-btn" onClick={(e) => { e.stopPropagation(); onShowDesktop && onShowDesktop(); }} title="Show Desktop">
                    <svg width="16" height="14" viewBox="0 0 16 14" style={{ display: 'block' }}>
                        <rect x="1" y="1" width="14" height="9" fill="#008080" stroke="#000" />
                        <rect x="5" y="11" width="6" height="2" fill="#808080" />
                    </svg>
                </button>
                <div className="task-area">
                    {windows.map((win) => (
                        <button
                            key={win.id}
                            data-task-id={win.id}
                            className={`task-tab ${activeWindowId === win.id && !win.isMinimized ? 'active' : ''} ${flashingWindows.has(win.id) ? 'flashing' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggleWindow(win.id); }}
                            onContextMenu={(e) => handleContextMenu(e, win.id)}
                        >
                            <span className="task-tab-text">{win.title}</span>
                        </button>
                    ))}
                </div>
                <div className="tray-area">
                    <div className="tray-icon" title={isOnline ? 'Connected to the network' : 'No network connection'}>
                        <span className={`tray-network ${isOnline ? '' : 'offline'}`}>{isOnline ? '🌐' : '⛔'}</span>
                    </div>
                    {visitorCount !== null && (
                        <div className="tray-icon" title={`Site visitors: ${visitorCount}`}>👥</div>
                    )}
                    <div className={`tray-icon ${isVolumeOpen ? 'active' : ''}`} onClick={toggleVolume} title="Volume">
                        <img
                            src={volumePercent === 0 ? mutedIcon : loudIcon}
                            alt="Volume"
                            style={{ width: '16px', height: '16px' }}
                        />
                    </div>
                    <div className="tray-icon" onClick={toggleFullScreen} title="Full Screen">🖥️</div>
                    <div className="tray-clock" onClick={toggleCalendar} title={time.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
                        {formatTime(time)}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Taskbar;
