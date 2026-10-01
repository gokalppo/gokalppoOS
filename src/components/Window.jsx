import React, { useRef, useState, useLayoutEffect } from 'react';
import Draggable from 'react-draggable';
import { useOS } from '../context/OSContext';
import {
    TASKBAR_HEIGHT,
    RESIZE_HANDLES,
    resolveInitialSize,
    cascadePosition,
    computeResize
} from './windowUtils';
import './Window.css';

const MINIMIZE_MS = 220;
let openedCount = 0; // drives the cascade offset of newly opened windows

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const viewportSize = () => ({ width: window.innerWidth, height: window.innerHeight });

const iconStyle = { width: '16px', height: '16px', marginRight: '4px', marginLeft: '2px' };

const Window = ({
    id,
    title,
    children,
    content,
    zIndex,
    initialPosition,
    onClose,
    onMinimize,
    onFocus,
    isActive = true,
    isMinimized = false,
    isClosing = false,
    style: propStyle,
    bodyStyle,
    bodyClassName,
    resizable = true,
    icon,
    width,
    height,
    minWidth,
    minHeight
}) => {
    const { playSound } = useOS();
    const nodeRef = useRef(null);
    const resizeRef = useRef(null);
    const minimizeAnimRef = useRef(null);
    const hideTimerRef = useRef(null);
    const prevMinimizedRef = useRef(isMinimized);

    const [initial] = useState(() => {
        const viewport = viewportSize();
        const size = resolveInitialSize({ width, height, minWidth, minHeight }, viewport);
        const position = initialPosition || cascadePosition(size, viewport, openedCount++);
        return { size, position };
    });
    const [size, setSize] = useState({ width: initial.size.width, height: initial.size.height });
    const [pos, setPos] = useState(initial.position);
    const [maximized, setMaximized] = useState(false);
    const [opening, setOpening] = useState(true);
    const [hidden, setHidden] = useState(isMinimized);

    // Restoring un-hides immediately (adjusting state while rendering, not in an effect).
    if (!isMinimized && hidden) setHidden(false);

    const min = { width: initial.size.minWidth, height: initial.size.minHeight };

    // Fly to / from this window's taskbar button on minimize / restore.
    useLayoutEffect(() => {
        if (prevMinimizedRef.current === isMinimized) return;
        prevMinimizedRef.current = isMinimized;
        const el = nodeRef.current;
        if (!el) return;

        minimizeAnimRef.current?.cancel();
        minimizeAnimRef.current = null;
        clearTimeout(hideTimerRef.current);

        if (prefersReducedMotion() || typeof el.animate !== 'function') {
            if (isMinimized) Promise.resolve().then(() => setHidden(true));
            return;
        }

        const rect = el.getBoundingClientRect();
        const tab = document.querySelector(`[data-task-id="${id}"]`);
        const t = tab
            ? tab.getBoundingClientRect()
            : { left: rect.left + rect.width / 2, top: window.innerHeight, width: 10, height: 10 };
        const away = {
            translate: `${t.left - rect.left}px ${t.top - rect.top}px`,
            scale: `${Math.max(0.05, t.width / rect.width)} ${Math.max(0.05, t.height / rect.height)}`,
            opacity: 0.2
        };
        const here = { translate: '0px 0px', scale: '1 1', opacity: 1 };

        const anim = el.animate(isMinimized ? [here, away] : [away, here], {
            duration: MINIMIZE_MS,
            easing: 'ease-in-out',
            fill: isMinimized ? 'forwards' : 'none'
        });
        minimizeAnimRef.current = anim;

        if (isMinimized) {
            // Hide once the fly-out ends; the timer is a backstop for when the
            // browser throttles animations (e.g. a background tab).
            const finish = () => {
                clearTimeout(hideTimerRef.current);
                setHidden(true);
                anim.cancel();
            };
            anim.finished.then(finish).catch(() => { /* cancelled by a quick restore */ });
            hideTimerRef.current = setTimeout(finish, MINIMIZE_MS + 120);
        }
    }, [isMinimized, id]);

    const toggleMaximize = (e) => {
        e?.stopPropagation();
        if (!resizable) return;
        playSound('restore');
        setMaximized((m) => !m);
    };

    const startResize = (e, handle) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        onFocus && onFocus(id);
        resizeRef.current = {
            handle,
            startX: e.clientX,
            startY: e.clientY,
            start: { x: pos.x, y: pos.y, width: size.width, height: size.height }
        };
    };

    const moveResize = (e) => {
        const r = resizeRef.current;
        if (!r) return;
        const next = computeResize(r.handle, r.start, e.clientX - r.startX, e.clientY - r.startY, min, viewportSize());
        setPos({ x: next.x, y: next.y });
        setSize({ width: next.width, height: next.height });
    };

    const endResize = () => { resizeRef.current = null; };

    const viewport = viewportSize();
    const windowStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: maximized ? '100%' : size.width,
        height: maximized ? `calc(100% - ${TASKBAR_HEIGHT}px)` : size.height,
        minWidth: min.width,
        minHeight: min.height,
        zIndex: zIndex || 1000,
        boxSizing: 'border-box',
        display: hidden ? 'none' : 'flex',
        flexDirection: 'column',
        transformOrigin: '0 0',
        ...propStyle
    };

    const className = [
        'window',
        isActive ? '' : 'inactive',
        opening ? 'window-opening' : '',
        isClosing ? 'window-closing' : '',
        maximized ? 'maximized' : ''
    ].filter(Boolean).join(' ');

    const renderedIcon = icon
        ? (React.isValidElement(icon)
            ? React.cloneElement(icon, { style: iconStyle })
            : <img src={icon} alt="" style={iconStyle} />)
        : null;

    return (
        <Draggable
            handle=".title-bar"
            cancel=".title-bar-controls button"
            nodeRef={nodeRef}
            disabled={maximized}
            position={maximized ? { x: 0, y: 0 } : pos}
            bounds={{
                left: 100 - size.width,
                top: 0,
                right: viewport.width - 100,
                bottom: viewport.height - TASKBAR_HEIGHT - 24
            }}
            onStart={() => onFocus && onFocus(id)}
            onDrag={(e, data) => setPos({ x: data.x, y: data.y })}
            onStop={(e, data) => setPos({ x: data.x, y: data.y })}
        >
            <div
                ref={nodeRef}
                className={className}
                style={windowStyle}
                onMouseDownCapture={() => onFocus && onFocus(id)}
                onAnimationEnd={(e) => { if (e.target === nodeRef.current) setOpening(false); }}
            >
                <div className="title-bar" onDoubleClick={toggleMaximize}>
                    {renderedIcon}
                    <div className="title-bar-text">{title}</div>
                    <div className="title-bar-controls">
                        <button
                            title="Minimize"
                            onClick={(e) => { e.stopPropagation(); onMinimize && onMinimize(id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="minimize-button"
                        >
                            <svg width="8" height="8" viewBox="0 0 8 8" style={{ display: 'block' }}>
                                <rect x="0" y="6" width="6" height="2" fill="currentColor" />
                            </svg>
                        </button>
                        <button
                            title={maximized ? 'Restore' : 'Maximize'}
                            onClick={toggleMaximize}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`maximize-button ${!resizable ? 'disabled' : ''}`}
                            disabled={!resizable}
                        >
                            {maximized ? (
                                <svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}>
                                    <rect x="3" y="0" width="7" height="2" fill="currentColor" />
                                    <rect x="3" y="2" width="1" height="4" fill="currentColor" />
                                    <rect x="9" y="2" width="1" height="5" fill="currentColor" />
                                    <rect x="6" y="6" width="4" height="1" fill="currentColor" />
                                    <rect x="0" y="3" width="7" height="2" fill="currentColor" />
                                    <rect x="0" y="5" width="1" height="4" fill="currentColor" />
                                    <rect x="6" y="5" width="1" height="4" fill="currentColor" />
                                    <rect x="1" y="8" width="5" height="1" fill="currentColor" />
                                </svg>
                            ) : (
                                <svg width="9" height="9" viewBox="0 0 9 9" style={{ display: 'block' }}>
                                    <rect x="0" y="0" width="9" height="2" fill="currentColor" />
                                    <rect x="0" y="2" width="1" height="7" fill="currentColor" />
                                    <rect x="8" y="2" width="1" height="7" fill="currentColor" />
                                    <rect x="1" y="8" width="7" height="1" fill="currentColor" />
                                </svg>
                            )}
                        </button>
                        <button
                            title="Close"
                            onClick={(e) => { e.stopPropagation(); onClose && onClose(id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="close-button"
                            style={{ marginLeft: '2px' }}
                        >
                            X
                        </button>
                    </div>
                </div>
                <div
                    className={`window-body ${bodyClassName || ''}`}
                    style={{
                        flex: 1,
                        padding: '10px',
                        backgroundColor: 'white',
                        color: 'black',
                        position: 'relative',
                        overflow: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        ...bodyStyle
                    }}
                >
                    {content || children}
                </div>

                {resizable && !maximized && RESIZE_HANDLES.map((handle) => (
                    <div
                        key={handle}
                        className={`resize-handle resize-${handle}`}
                        onPointerDown={(e) => startResize(e, handle)}
                        onPointerMove={moveResize}
                        onPointerUp={endResize}
                        onPointerCancel={endResize}
                    />
                ))}
            </div>
        </Draggable>
    );
};

export default Window;
