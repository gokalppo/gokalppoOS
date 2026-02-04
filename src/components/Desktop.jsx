import React, { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import Taskbar from './Taskbar';
import Window from './Window';
import Notepad from './apps/Notepad';
import Minesweeper from './apps/Minesweeper';
import MusicPlayer from './apps/MusicPlayer';
import Terminal from './apps/Terminal';
import PlaceholderApp from './apps/PlaceholderApp';
import Gallery from './apps/Gallery';
import Contact from './apps/Contact';
import MyResume from './apps/MyResume';
// ... (keep other imports)
// ...

import './Desktop.css';
import wallpaper from '../assets/images/image.png';
import minesweeperIcon from '../assets/images/minesweeper.svg';
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

import Messenger from './apps/messenger/MessengerContainer';

const DesktopIcon = ({ id, title, icon, position, isSelected, onDoubleClick, onDrag, onStop, onClick }) => {
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
                className={`desktop-icon-draggable ${isSelected ? 'selected' : ''}`}
                onClick={handleClick}
                // Stop propagation onMouseDown to prevent desktop selection start when clicking icon
                onMouseDown={(e) => { e.stopPropagation(); onClick(e); }}
            >
                <span className="icon-img">{icon}</span>
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
    onWindowFocus,
    isStartOpen,
    toggleStart,
    onShutdown // Receive here
}) => {
    // Initial App Data
    const initialApps = [
        {
            id: 'computer',
            title: 'My Computer',
            icon: <img src={computerIcon} alt="My Computer" style={{ width: '32px', height: '32px' }} />,
            content: <PlaceholderApp text="My Computer Content" />,
            x: 10,
            y: 10
        },
        {
            id: 'recycle',
            title: 'Recycle Bin',
            icon: <img src={binEmptyIcon} alt="Recycle Bin" style={{ width: '32px', height: '32px' }} />,
            content: <PlaceholderApp text="Recycle Bin Empty" />,
            x: 10,
            y: 100
        },
        {
            id: 'notepad',
            title: 'Notepad',
            icon: <img src={notepadIcon} alt="Notepad" style={{ width: '32px', height: '32px' }} />,
            content: <Notepad />,
            x: 10,
            y: 190
        },
        { id: 'resume', title: 'My Resume', icon: <img src={resumeIcon} alt="My Resume" style={{ width: '32px', height: '32px' }} />, content: <MyResume />, x: 10, y: 280 },
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
        { id: 'contact', title: 'Contact', icon: <img src={contactIcon} alt="Contact" style={{ width: '32px', height: '32px' }} />, content: <Contact />, x: 10, y: 550, options: { width: '400px', height: '250px', minHeight: '200px' } },
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
            id: 'messenger',
            title: 'Messenger',
            icon: <img src={messengerIcon} alt="Messenger" style={{ width: '32px', height: '32px' }} />,
            content: <Messenger />,
            x: 10,
            y: 640,
            options: { width: '500px', height: '500px' }
        },
    ];

    const [icons, setIcons] = useState(initialApps);
    const [selectedIconIds, setSelectedIconIds] = useState([]);
    const [selection, setSelection] = useState(null);
    const [isDraggingGroup, setIsDraggingGroup] = useState(false);

    // Nudge & Notification State
    const [shakingWindowId, setShakingWindowId] = useState(null);
    const [toast, setToast] = useState(null);

    useEffect(() => {
        // Nudge Handler
        const handleNudge = (e) => {
            const appId = e.detail.appId;
            setShakingWindowId(appId);
            setTimeout(() => setShakingWindowId(null), 500);
        };

        // Toast Handler
        const handleToast = (e) => {
            setToast(e.detail);
            setTimeout(() => setToast(null), 3000);
        };

        window.addEventListener('nudge', handleNudge);
        window.addEventListener('messenger-notification', handleToast);
        return () => {
            window.removeEventListener('nudge', handleNudge);
            window.removeEventListener('messenger-notification', handleToast);
        };
    }, []);

    // SELECTION BOX LOGIC
    const handleDesktopMouseDown = (e) => {
        // Clear selection if clicking on desktop
        if (e.target.className === 'desktop' || e.target.className === 'desktop-icons-container') {
            setSelectedIconIds([]);
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

        setSelectedIconIds(newSelectedIds);
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
        if (!selectedIconIds.includes(id)) {
            setSelectedIconIds([id]);
        }
    };

    // DRAG LOGIC
    const handleIconDrag = (id, data) => {
        const { deltaX, deltaY } = data;

        setIcons(prevIcons => prevIcons.map(icon => {
            // Apply delta to ALL selected icons
            if (selectedIconIds.includes(icon.id)) {
                return { ...icon, x: icon.x + deltaX, y: icon.y + deltaY };
            }
            return icon;
        }));
    };

    return (
        <div
            className="desktop"
            style={{ backgroundImage: `url(${wallpaper})` }}
            onMouseDown={handleDesktopMouseDown}
            onMouseMove={handleDesktopMouseMove}
            onMouseUp={handleDesktopMouseUp}
        >
            {selection && (
                <div className="selection-box" style={getSelectionBoxStyle()}></div>
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
                        onDoubleClick={() => onOpenWindow(app.title, app.content, { icon: app.icon, ...app.options })}
                        onDrag={handleIconDrag}
                        onStop={() => { }}
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
                    onMaximize={() => { }} /* TODO: Implement Maximize/Minimize Logic if needed or use Window internal state */
                    onFocus={onWindowFocus}
                    isActive={focusedWindowId === win.id}
                    zIndex={win.zIndex}
                    isMinimized={win.isMinimized}
                    className={shakingWindowId === win.id ? 'window-shake' : ''}
                    icon={win.icon}
                >
                    {/* SAFELY RENDER CONTENT */}
                    {win.content ? win.content : <div style={{ padding: '20px' }}>Content Loading Error...</div>}
                </Window>
            ))}

            <Taskbar
                windows={openWindows}
                activeWindowId={focusedWindowId}
                onToggleWindow={onWindowFocus} /* Taskbar still calls it onToggleWindow technically, can likely stay same or rename in Taskbar */
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
