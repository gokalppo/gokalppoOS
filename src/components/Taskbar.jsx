import { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import { useLanguage } from '../context/LanguageContext';
import StartMenu from './StartMenu';
import { playSystemSound } from '../audio/systemSounds';
import CalendarPopup from './CalendarPopup';
import RunDialog from './RunDialog';
import { useStartActions, SETTINGS_IDS } from './startActions';
import { resolveRunCommand } from './runCommand';
import { queueTerminalCommand } from './apps/terminalBus';
import './Taskbar.css';
import startIcon from '../assets/images/windows.png';
import loudIcon from '../assets/images/loud.png';
import mutedIcon from '../assets/images/muted.png';

const Taskbar = ({
    windows,
    activeWindowId,
    onToggleWindow,
    onShowDesktop,
    programs = [],
    onCloseWindow,
    onOpenWindow,
    isStartOpen = false,
    toggleStart = () => console.warn("toggleStart prop missing"),
    onShutdown // Add this prop
}) => {
    const { volume, setGlobalVolume, soundsEnabled, setSoundsEnabled, playSound } = useOS(); // Use Audio Driver
    const { t, lang, toggleLang } = useLanguage();
    const [time, setTime] = useState(new Date());
    const [contextMenu, setContextMenu] = useState(null); // { x, y, windowId }
    const [isVolumeOpen, setIsVolumeOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isRunOpen, setIsRunOpen] = useState(false);
    const startActions = useStartActions(onOpenWindow);
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
        const handleEscape = (e) => {
            if (e.key !== 'Escape') return;
            setIsVolumeOpen(false);
            setIsCalendarOpen(false);
            setContextMenu(null);
            if (isStartOpen) toggleStart();
        };
        window.addEventListener('keydown', handleEscape);
        window.addEventListener('click', handleClickOutside);
        return () => {
            window.removeEventListener('click', handleClickOutside);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isStartOpen, toggleStart]);

    // Start > Run...: open a program, a web address, or hand a command to the Terminal.
    const programIds = [...programs.map((p) => p.id), ...SETTINGS_IDS];
    const launchProgram = (app) => onOpenWindow(app.title, app.content, { icon: app.icon, ...app.options });
    const executeRun = (input) => {
        const result = resolveRunCommand(input, programIds);
        if (result.type === 'program') {
            if (result.id === 'systemproperties') startActions.openSystemProperties();
            else if (result.id === 'displayproperties') startActions.openDisplayProperties();
            else launchProgram(programs.find((p) => p.id === result.id));
        } else if (result.type === 'url') {
            window.open(result.url, '_blank', 'noopener,noreferrer');
        } else if (result.type === 'terminal') {
            queueTerminalCommand(result.command);
            const terminal = programs.find((p) => p.id === 'terminal');
            if (terminal) launchProgram(terminal);
        }
    };

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
        return date.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
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
                programs={programs}
                actions={startActions}
                onRun={() => setIsRunOpen(true)}
            />

            {isRunOpen && <RunDialog onExecute={executeRun} onClose={() => setIsRunOpen(false)} />}

            {contextMenu && (
                <div
                    className="taskbar-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="taskbar-context-item" onClick={handleCloseFromMenu}>{t('window.close')}</div>
                </div>
            )}

            {/* Volume Panel */}
            {isVolumeOpen && (
                <div className="volume-panel" role="dialog" aria-label={t('taskbar.volume')} onClick={(e) => e.stopPropagation()}>
                    <div className="volume-title">{t('taskbar.volume')}</div>
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
                                aria-label={t('taskbar.volume')}
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
                        <label htmlFor="mute-check">{t('volume.mute')}</label>
                    </div>
                    <div className="volume-mute-container">
                        <input
                            type="checkbox"
                            id="system-sounds-check"
                            checked={soundsEnabled}
                            onChange={handleSoundsToggle}
                        />
                        <label htmlFor="system-sounds-check">{t('volume.systemSounds')}</label>
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
                <button className="show-desktop-btn" aria-label={t('taskbar.showDesktop')} onClick={(e) => { e.stopPropagation(); onShowDesktop && onShowDesktop(); }} title={t('taskbar.showDesktop')}>
                    <svg width="18" height="16" viewBox="0 0 18 16" style={{ display: 'block' }} aria-hidden="true">
                        <rect x="1" y="2" width="16" height="11" fill="#008080" stroke="#000" />
                        <rect x="1" y="2" width="16" height="3" fill="#000080" stroke="#000" />
                        <path d="M6 13 L12 7 L14 9 L8 15 L5.5 15.5Z" fill="#f3c623" stroke="#000" strokeWidth="0.8" />
                    </svg>
                </button>
                <div className="task-area">
                    {windows.map((win) => (
                        <button
                            key={win.id}
                            data-task-id={win.id}
                            aria-pressed={activeWindowId === win.id && !win.isMinimized}
                            className={`task-tab ${activeWindowId === win.id && !win.isMinimized ? 'active' : ''} ${flashingWindows.has(win.id) ? 'flashing' : ''}`}
                            onClick={(e) => { e.stopPropagation(); onToggleWindow(win.id); }}
                            onContextMenu={(e) => handleContextMenu(e, win.id)}
                        >
                            <span className="task-tab-text">{win.title}</span>
                        </button>
                    ))}
                </div>
                <div className="tray-area">
                    <button type="button" className="tray-icon tray-lang" onClick={(e) => { e.stopPropagation(); toggleLang(); }} title={t('taskbar.language')} aria-label={t('taskbar.language')}>
                        {lang.toUpperCase()}
                    </button>
                    <div className="tray-icon" role="img" title={isOnline ? t('taskbar.networkOn') : t('taskbar.networkOff')} aria-label={isOnline ? t('taskbar.networkOn') : t('taskbar.networkOff')}>
                        <span className={`tray-network ${isOnline ? '' : 'offline'}`}>{isOnline ? '🌐' : '⛔'}</span>
                    </div>
                    {visitorCount !== null && (
                        <div className="tray-icon" role="img" title={t('taskbar.visitors', { count: visitorCount })} aria-label={t('taskbar.visitors', { count: visitorCount })}>👥</div>
                    )}
                    <button type="button" className={`tray-icon ${isVolumeOpen ? 'active' : ''}`} onClick={toggleVolume} title={t('taskbar.volume')} aria-label={t('taskbar.volume')} aria-expanded={isVolumeOpen}>
                        <img
                            src={volumePercent === 0 ? mutedIcon : loudIcon}
                            alt="Volume"
                            style={{ width: '16px', height: '16px' }}
                        />
                    </button>
                    <button type="button" className="tray-icon" onClick={toggleFullScreen} title={t('taskbar.fullScreen')} aria-label={t('taskbar.fullScreen')}>🖥️</button>
                    <button type="button" className="tray-clock" aria-expanded={isCalendarOpen} onClick={toggleCalendar} title={time.toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
                        {formatTime(time)}
                    </button>
                </div>
            </div>
        </>
    );
};

export default Taskbar;
