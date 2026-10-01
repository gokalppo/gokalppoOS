import React, { useEffect, useRef, useState, lazy, Suspense } from 'react';
import Draggable from 'react-draggable';
import Taskbar from './Taskbar';
import Window from './Window';
import ErrorBoundary from './ErrorBoundary';
import { useLanguage } from '../context/LanguageContext';
import PlaceholderApp from './apps/PlaceholderApp';
import Contact from './apps/Contact';
import MyResume from './apps/MyResume';

// Code-split the heavier/less-immediately-needed apps (and anything pulling
// in Firebase) into their own chunks, fetched only when their window is
// actually opened instead of bloating the initial bundle everyone pays for.
const Notepad = lazy(() => import('./apps/Notepad'));
const Minesweeper = lazy(() => import('./apps/Minesweeper'));
const MusicPlayer = lazy(() => import('./apps/MusicPlayer'));
const Terminal = lazy(() => import('./apps/Terminal'));
const Gallery = lazy(() => import('./apps/Gallery'));
const Paint = lazy(() => import('./apps/Paint'));
const FileExplorer = lazy(() => import('./apps/FileExplorer'));
// ... (keep other imports)
// ...

import './Desktop.css';
import { WALLPAPERS } from '../display/wallpapers';
import { useDisplay } from '../context/DisplayContext';
import minesweeperIcon from '../assets/images/minesweeper.png';
import ieIcon from '../assets/images/ie.webp';
import aboutIcon from '../assets/images/about.svg';
import { OPEN_APP_EVENT } from './appBus';
import guestbookIcon from '../assets/images/guestbook.svg';
import solitaireIcon from '../assets/images/solitaire.webp';
import binEmptyIcon from '../assets/images/Bin_Empty95.svg';
import binFullIcon from '../assets/images/Bin_Full95.svg';
import notepadIcon from '../assets/images/Notepad16.svg';
import computerIcon from '../assets/images/This_PC_1995.svg';
import cameraIcon from '../assets/images/camera.png';
import contactIcon from '../assets/images/contact.png';
import terminalIcon from '../assets/images/terminal.png';
import cdDriverIcon from '../assets/images/cd_driver.png';
import resumeIcon from '../assets/images/resume.png';
import messengerIcon from '../assets/images/msn.png';
import paintIcon from '../assets/images/paint.png';

const AboutMe = lazy(() => import('./apps/AboutMe'));
const InternetExplorer = lazy(() => import('./apps/InternetExplorer'));
const Guestbook = lazy(() => import('./apps/Guestbook'));
const Solitaire = lazy(() => import('./apps/Solitaire'));
const Messenger = lazy(() => import('./apps/messenger/MessengerContainer'));
// Pulls in Firebase (auth + database) just to show a hit counter — split
// into its own chunk instead of forcing every visitor to download Firebase
// before the desktop can even render.
const VisitorCounter = lazy(() => import('./VisitorCounter'));

const AppLoadingFallback = () => {
    const { t } = useLanguage();
    return (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', width: '100%', fontFamily: 'gokalppoOS, sans-serif',
        fontSize: '13px', color: '#404040', gap: '8px'
    }}>
        <span className="app-loading-spinner" />
        {t('window.loading')}
    </div>
    );
};

const ICON_POSITIONS_KEY = 'gokalppoOS_iconPositions';
const RESET_ANIMATION_MS = 350;

const DesktopIcon = ({ id, title, icon, position, isSelected, isAnimating, onDoubleClick, onDrag, onStop, onClick }) => {
    const nodeRef = useRef(null);
    const lastClickRef = useRef(0);

    // We use a controlled component approach for position now
    // But react-draggable works best when we just update the position prop

    const handleClick = (e) => {
        // Prevent drag events from triggering click immediately
        e.stopPropagation();

        const now = Date.now();
        const timeDiff = now - lastClickRef.current;

        if (timeDiff < 300 && timeDiff > 0) {
            onDoubleClick();
            lastClickRef.current = 0;
        } else {
            lastClickRef.current = now;
            onClick(e); // Single click for selection
        }
    };

    return (
        <Draggable
            nodeRef={nodeRef}
            position={position}
            onDrag={(e, data) => onDrag(id, data)}
            onStop={onStop}
        >
            <div
                ref={nodeRef}
                className={`desktop-icon-draggable ${isSelected ? 'selected' : ''} ${isAnimating ? 'resetting' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={title}
                aria-pressed={isSelected}
                onClick={handleClick}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onDoubleClick();
                    }
                }}
                // Stop propagation onMouseDown to prevent desktop selection start when clicking icon
                onMouseDown={(e) => { e.stopPropagation(); onClick(e); }}
            >
                <span className="icon-img" aria-hidden="true">{icon}</span>
                <span className="icon-text">{title}</span>
            </div>
        </Draggable>
    );
};

const Desktop = ({
    openWindows,
    focusedWindowId,
    onOpenWindow,
    onCloseWindow,
    onMinimizeWindow,
    onTaskbarToggle,
    onShowDesktop,
    onWindowFocus,
    isStartOpen,
    toggleStart,
    onShutdown // Receive here
}) => {
    const { t } = useLanguage();
    const { display } = useDisplay();
    const wallpaperImage = (WALLPAPERS[display.wallpaper] || WALLPAPERS.starfield).image;
    // Initial App Data
    // Opens a .txt file from the file system in its own Notepad window.
    const handleOpenFile = (node) => {
        if (node.name.toLowerCase().endsWith('.txt')) {
            onOpenWindow(node.name, <Notepad initialFileId={node.id} />, {
                icon: <img src={notepadIcon} alt="Notepad" style={{ width: '32px', height: '32px' }} />
            });
        }
    };

    const initialApps = [
        {
            id: 'computer',
            title: 'My Computer',
            icon: <img src={computerIcon} alt="My Computer" style={{ width: '32px', height: '32px' }} />,
            content: <FileExplorer rootId="root" onOpenFile={handleOpenFile} />,
            x: 10,
            y: 10,
            options: { width: '480px', height: '380px', minWidth: '360px', minHeight: '280px', bodyStyle: { padding: 0 } }
        },
        {
            id: 'recycle',
            title: 'Recycle Bin',
            icon: <img src={binEmptyIcon} alt="Recycle Bin" style={{ width: '32px', height: '32px' }} />,
            content: <FileExplorer rootId="recycle" onOpenFile={handleOpenFile} />,
            x: 10,
            y: 100,
            options: { width: '480px', height: '380px', minWidth: '360px', minHeight: '280px', bodyStyle: { padding: 0 } }
        },
        {
            id: 'notepad',
            title: 'Notepad',
            icon: <img src={notepadIcon} alt="Notepad" style={{ width: '32px', height: '32px' }} />,
            content: <Notepad />,
            x: 10,
            y: 190
        },
        { id: 'resume', title: 'My Resume', icon: <img src={resumeIcon} alt="My Resume" style={{ width: '32px', height: '32px' }} />, content: <MyResume />, x: 10, y: 280, options: { width: '640px', height: '580px', minWidth: '420px', minHeight: '360px', bodyStyle: { padding: 0 } } },
        {
            id: 'terminal',
            title: 'Terminal',
            icon: <img src={terminalIcon} alt="Terminal" style={{ width: '32px', height: '32px' }} />,
            content: <Terminal />,
            x: 10,
            y: 370,
            options: { bodyStyle: { backgroundColor: 'black', padding: 0 } }
        },
        {
            id: 'gallery',
            title: 'Gallery',
            icon: <img src={cameraIcon} alt="Gallery" style={{ width: '32px', height: '32px' }} />,
            content: <Gallery />,
            x: 10,
            y: 460
        },
        { id: 'contact', title: 'Contact', icon: <img src={contactIcon} alt="Contact" style={{ width: '32px', height: '32px' }} />, content: <Contact />, x: 10, y: 550, options: { width: '400px', height: '300px', minHeight: '260px' } },
        {
            id: 'minesweeper',
            title: 'Minesweeper',
            icon: <img src={minesweeperIcon} alt="Minesweeper" style={{ width: '32px', height: '32px' }} />,
            content: <Minesweeper />,
            x: 100,
            y: 10
        },
        { id: 'musicplayer', title: 'Music Player', icon: <img src={cdDriverIcon} alt="Music Player" style={{ width: '32px', height: '32px' }} />, content: <MusicPlayer />, x: 100, y: 100 },
        {
            id: 'paint',
            title: 'Paint',
            icon: <img src={paintIcon} alt="Paint" style={{ width: '32px', height: '32px' }} />,
            content: <Paint />,
            x: 100,
            y: 190,
            options: { width: '830px', height: '600px', minWidth: '750px', minHeight: '550px', bodyStyle: { padding: 0 } }
        },
        {
            id: 'internetexplorer',
            title: 'Internet Explorer',
            icon: <img src={ieIcon} alt="Internet Explorer" style={{ width: '32px', height: '32px' }} />,
            content: <InternetExplorer />,
            x: 100,
            y: 280,
            options: { width: '720px', height: '520px', minWidth: '420px', minHeight: '320px', bodyStyle: { padding: 0 } }
        },
        {
            id: 'guestbook',
            title: 'Guestbook',
            icon: <img src={guestbookIcon} alt="Guestbook" style={{ width: '32px', height: '32px' }} />,
            content: <Guestbook />,
            x: 100,
            y: 370,
            options: { width: '420px', height: '520px', minWidth: '340px', minHeight: '380px', bodyStyle: { padding: 0 } }
        },
        {
            id: 'solitaire',
            title: 'Solitaire',
            icon: <img src={solitaireIcon} alt="Solitaire" style={{ width: '32px', height: '32px' }} />,
            content: <Solitaire />,
            x: 100,
            y: 460,
            options: { width: '620px', height: '540px', minWidth: '560px', minHeight: '420px', bodyStyle: { padding: 0 } }
        },
        {
            id: 'aboutme',
            title: 'About Me',
            icon: <img src={aboutIcon} alt="About Me" style={{ width: '32px', height: '32px' }} />,
            content: <AboutMe />,
            x: 100,
            y: 550,
            options: { width: '520px', height: '460px', minWidth: '380px', minHeight: '320px', bodyStyle: { padding: 0 } }
        },
        {
            id: 'messenger',
            title: 'Messenger',
            icon: <img src={messengerIcon} alt="Messenger" style={{ width: '32px', height: '32px' }} />,
            content: <Messenger />,
            x: 10,
            y: 640,
            options: { width: '500px', height: '500px' }
        },
    ];

    // Everything launchable, for Start > Programs and Run. The id matches the window id (derived from the title).
    const programs = initialApps.map((app) => ({
        id: app.options?.id || app.title.toLowerCase().replace(/\s/g, ''),
        title: app.title,
        icon: app.icon,
        content: app.content,
        options: app.options
    }));

    // Windows can ask the desktop to open an app by window id (e.g. Welcome > "Open resume").
    const programsRef = useRef(programs);
    const openWindowRef = useRef(onOpenWindow);
    useEffect(() => {
        programsRef.current = programs;
        openWindowRef.current = onOpenWindow;
    });
    useEffect(() => {
        const handleOpenApp = (e) => {
            const app = programsRef.current.find((p) => p.id === e.detail.id);
            if (app) openWindowRef.current(app.title, app.content, { icon: app.icon, ...app.options });
        };
        window.addEventListener(OPEN_APP_EVENT, handleOpenApp);
        return () => window.removeEventListener(OPEN_APP_EVENT, handleOpenApp);
    }, []);

    const [icons, setIcons] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(ICON_POSITIONS_KEY) || '{}');
            return initialApps.map((app) =>
                saved[app.id] ? { ...app, x: saved[app.id].x, y: saved[app.id].y } : app
            );
        } catch {
            return initialApps;
        }
    });
    const [selectedIconIds, setSelectedIconIds] = useState([]);
    // Mirrors selectedIconIds synchronously. React's own state update can lag
    // behind react-draggable's mousedown->onDrag sequence by a tick, so drag
    // logic reads this ref instead of the state to avoid dragging whatever
    // was selected a moment ago.
    const selectedIconIdsRef = useRef([]);
    const updateSelectedIconIds = (ids) => {
        selectedIconIdsRef.current = ids;
        setSelectedIconIds(ids);
    };
    const [selection, setSelection] = useState(null);
    const [desktopContextMenu, setDesktopContextMenu] = useState(null);
    const [isResetAnimating, setIsResetAnimating] = useState(false);

    // Delay mounting the visitor counter slightly so the (Firebase-backed)
    // chunk it pulls in downloads after the desktop has already rendered,
    // instead of competing with it on first paint.
    const [showVisitorCounter, setShowVisitorCounter] = useState(false);
    useEffect(() => {
        const timer = setTimeout(() => setShowVisitorCounter(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    // Notification State
    const [toast, setToast] = useState(null);

    useEffect(() => {
        // Toast Handler
        const handleToast = (e) => {
            setToast(e.detail);
            setTimeout(() => setToast(null), 3000);
        };

        // Close Handler (apps that only have OSContext, not onCloseWindow, ask via this event)
        const handleCloseRequest = (e) => {
            onCloseWindow(e.detail.id);
        };

        window.addEventListener('messenger-notification', handleToast);
        window.addEventListener('os-close-window', handleCloseRequest);
        return () => {
            window.removeEventListener('messenger-notification', handleToast);
            window.removeEventListener('os-close-window', handleCloseRequest);
        };
    }, [onCloseWindow]);

    // SELECTION BOX LOGIC
    const handleDesktopMouseDown = (e) => {
        if (desktopContextMenu) setDesktopContextMenu(null);

        // Clear selection if clicking on desktop
        if (e.target.className === 'desktop' || e.target.className === 'desktop-icons-container') {
            updateSelectedIconIds([]);
            setSelection({
                startX: e.clientX,
                startY: e.clientY,
                currentX: e.clientX,
                currentY: e.clientY
            });
        }
    };

    const handleDesktopMouseMove = (e) => {
        if (!selection) return;

        const newSelection = {
            ...selection,
            currentX: e.clientX,
            currentY: e.clientY
        };
        setSelection(newSelection);

        // COLLISION LOGIC
        // Calculate box rect
        const boxLeft = Math.min(newSelection.startX, newSelection.currentX);
        const boxTop = Math.min(newSelection.startY, newSelection.currentY);
        const boxWidth = Math.abs(newSelection.currentX - newSelection.startX);
        const boxHeight = Math.abs(newSelection.currentY - newSelection.startY);
        const boxRight = boxLeft + boxWidth;
        const boxBottom = boxTop + boxHeight;

        // Check against icons
        // Assuming icon size approx 80x80 (from CSS)
        const ICON_WIDTH = 80;
        const ICON_HEIGHT = 80;

        const newSelectedIds = icons.filter(icon => {
            const iconRight = icon.x + ICON_WIDTH;
            const iconBottom = icon.y + ICON_HEIGHT;

            // Intersection formula
            return (
                boxLeft < iconRight &&
                boxRight > icon.x &&
                boxTop < iconBottom &&
                boxBottom > icon.y
            );
        }).map(icon => icon.id);

        updateSelectedIconIds(newSelectedIds);
    };

    const handleDesktopMouseUp = () => {
        setSelection(null);
    };

    const getSelectionBoxStyle = () => {
        if (!selection) return {};
        const left = Math.min(selection.startX, selection.currentX);
        const top = Math.min(selection.startY, selection.currentY);
        const width = Math.abs(selection.currentX - selection.startX);
        const height = Math.abs(selection.currentY - selection.startY);
        return { left, top, width, height };
    };

    // ICON CLICK LOGIC
    // RECYCLE BIN EASTER EGG
    const [recycleClicks, setRecycleClicks] = useState(0);

    const handleIconClick = (e, id) => {
        // Recycle Bin Interaction
        if (id === 'recycle') {
            const newCount = recycleClicks + 1;
            setRecycleClicks(newCount);

            if (newCount === 10) {
                // Change icon to "Full"
                setIcons(prev => prev.map(icon =>
                    icon.id === 'recycle' ? { ...icon, icon: <img src={binFullIcon} alt="Recycle Bin Full" style={{ width: '32px', height: '32px' }} /> } : icon
                ));

                // Show alert (setTimeout ensures the render happens first if React batches, 
                // but alert blocks, so doing it after a mini delay or just calling it)
                setTimeout(() => {
                    alert("I'm full, stop it!");
                    setRecycleClicks(0);

                    // Revert icon after alert closes (or shortly after)
                    setIcons(prev => prev.map(icon =>
                        icon.id === 'recycle' ? { ...icon, icon: <img src={binEmptyIcon} alt="Recycle Bin Empty" style={{ width: '32px', height: '32px' }} /> } : icon
                    ));
                }, 100);
            }
        }

        // If ctrl is pressed, toggle selection. Wrapper handles stopPropagation.
        // For simplicity now: Single click selects ONLY that icon, adding to current selection if CTRL? 
        // Windows behavior: Click selects one, deselects others unless Ctrl.
        // User request: "Masaüstünde boş bir yere tek tıkladığımda tüm seçimler iptal olsun" -> Implies normal behavior.

        // However, if we are dragging, we don't want to deselect others if the clicked one was already selected.
        // We handle selection logic in onMouseDown of icon usually or onClick.
        if (!selectedIconIdsRef.current.includes(id)) {
            updateSelectedIconIds([id]);
        }
    };

    // DRAG LOGIC
    const handleIconDrag = (id, data) => {
        const { deltaX, deltaY } = data;

        // Read the ref (always current) rather than the closed-over state,
        // and make sure the icon actually being dragged always moves even if
        // the selection update for it hasn't committed yet — this is what
        // caused "wrong icon drags" and "snaps back" bugs.
        const currentSelection = selectedIconIdsRef.current;
        const activeIds = currentSelection.includes(id) ? currentSelection : [id];

        setIcons(prevIcons => prevIcons.map(icon => {
            if (activeIds.includes(icon.id)) {
                return { ...icon, x: icon.x + deltaX, y: icon.y + deltaY };
            }
            return icon;
        }));
    };

    // Persist positions once the drag ends (not on every onDrag tick).
    const persistIconPositions = () => {
        setIcons((prev) => {
            try {
                const positions = {};
                prev.forEach((icon) => { positions[icon.id] = { x: icon.x, y: icon.y }; });
                localStorage.setItem(ICON_POSITIONS_KEY, JSON.stringify(positions));
            } catch {
                // localStorage unavailable (private mode, quota, etc.) — fail silently.
            }
            return prev;
        });
    };

    // RESET LOGIC: restore every icon to its default position, animated.
    const handleResetIconPositions = () => {
        setIsResetAnimating(true);
        try {
            localStorage.removeItem(ICON_POSITIONS_KEY);
        } catch {
            // localStorage unavailable — nothing to clean up.
        }
        setDesktopContextMenu(null);

        // Let the "resetting" (transition-enabled) class actually paint
        // before the positions change — if both land in the same React
        // commit, the browser has no "before" frame to transition from and
        // just snaps instantly instead of animating.
        setTimeout(() => setIcons(initialApps), 20);

        // Drop the transition class once the CSS animation has finished, so
        // normal dragging stays instant (no lag following the cursor).
        setTimeout(() => setIsResetAnimating(false), RESET_ANIMATION_MS + 50);
    };

    const handleDesktopContextMenu = (e) => {
        // Only show this on empty desktop space, not on top of an icon/window.
        if (e.target.className === 'desktop' || e.target.className === 'desktop-icons-container') {
            e.preventDefault();
            setDesktopContextMenu({ x: e.clientX, y: e.clientY });
        }
    };

    return (
        <div
            className="desktop"
            style={{ backgroundImage: wallpaperImage ? `url(${wallpaperImage})` : 'none', backgroundColor: 'var(--os-bg)' }}
            onMouseDown={handleDesktopMouseDown}
            onMouseMove={handleDesktopMouseMove}
            onContextMenu={handleDesktopContextMenu}
            onMouseUp={handleDesktopMouseUp}
        >
            {selection && (
                <div className="selection-box" style={getSelectionBoxStyle()}></div>
            )}

            {desktopContextMenu && (
                <div
                    className="desktop-context-menu"
                    style={{ left: desktopContextMenu.x, top: desktopContextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="desktop-context-item" onClick={handleResetIconPositions}>
                        {t('desktop.arrangeIcons')}
                    </div>
                </div>
            )}

            {showVisitorCounter && (
                <Suspense fallback={null}>
                    <VisitorCounter />
                </Suspense>
            )}

            <div className="desktop-icons-container">
                {icons.map(app => (
                    <DesktopIcon
                        key={app.id}
                        id={app.id}
                        title={app.title}
                        icon={app.icon}
                        position={{ x: app.x, y: app.y }}
                        isSelected={selectedIconIds?.includes(app.id)}
                        isAnimating={isResetAnimating}
                        onDoubleClick={() => onOpenWindow(app.title, app.content, { icon: app.icon, ...app.options })}
                        onDrag={handleIconDrag}
                        onStop={persistIconPositions}
                        onClick={(e) => handleIconClick(e, app.id)}
                    />
                ))}
            </div>

            {/* Render open windows */}
            {openWindows.map(win => (
                <Window
                    key={win.id}
                    id={win.id}
                    title={win.title}
                    onClose={() => onCloseWindow(win.id)}
                    onMinimize={onMinimizeWindow}
                    onFocus={onWindowFocus}
                    isActive={focusedWindowId === win.id}
                    zIndex={win.zIndex}
                    isMinimized={win.isMinimized}
                    isClosing={win.isClosing}
                    icon={win.icon}
                    width={win.width}
                    height={win.height}
                    minWidth={win.minWidth}
                    minHeight={win.minHeight}
                    bodyStyle={win.bodyStyle}
                    bodyClassName={win.bodyClassName}
                    resizable={win.resizable}
                >
                    {/* SAFELY RENDER CONTENT — lazy-loaded apps resolve inside this boundary */}
                    <ErrorBoundary title={win.title} onClose={() => onCloseWindow(win.id)}>
                        <Suspense fallback={<AppLoadingFallback />}>
                            {win.content ? win.content : <div style={{ padding: '20px' }}>{t('window.contentError')}</div>}
                        </Suspense>
                    </ErrorBoundary>
                </Window>
            ))}

            <Taskbar
                windows={openWindows}
                activeWindowId={focusedWindowId}
                onToggleWindow={onTaskbarToggle}
                onShowDesktop={onShowDesktop}
                programs={programs}
                onCloseWindow={onCloseWindow}
                onOpenWindow={onOpenWindow}
                isStartOpen={isStartOpen}
                toggleStart={toggleStart}
                onShutdown={onShutdown}
            />
            {/* Global Toast Notification */}
            {toast && (
                <div style={{
                    position: 'absolute',
                    bottom: '40px',
                    right: '10px',
                    width: '250px',
                    background: '#ffffe0',
                    border: '1px solid black',
                    padding: '10px',
                    boxShadow: '2px 2px 5px rgba(0,0,0,0.3)',
                    zIndex: 9999,
                    fontFamily: 'gokalppoOS, sans-serif',
                    fontSize: '12px'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>💬 {toast.title} says:</div>
                    <div>{toast.message}</div>
                </div>
            )}
        </div>
    );
};

export default Desktop;
