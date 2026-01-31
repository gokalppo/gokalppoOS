import React, { useRef, useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import './Window.css';

const Window = ({
    id,
    title,
    children,
    content,
    zIndex,
    isMinimized, // Passed from App.jsx options or state
    isOpen,
    initialPosition,
    onClose,
    onMinimize, // Not currently passed by App.jsx, handling gracefully
    onFocus,
    style: propStyle, // Receive passed style (display: none etc)
    bodyStyle,
    bodyClassName,
    resizable = true, // Default to true
    icon // New prop
}) => {
    const nodeRef = useRef(null);
    const [maximized, setMaximized] = useState(false);

    useEffect(() => {
        // console.log(`Window Mounted: ${title}`);
    }, [title]);

    // REFINED STANDARD STYLES AS REQUESTED
    const baseStyle = {
        position: 'absolute', // Changed from fixed to absolute per request
        top: '20%', // Fallback if no initialPosition
        left: '30%',
        width: '450px',
        height: '350px',
        minWidth: '300px',
        minHeight: '200px',
        zIndex: zIndex || 1000,
        backgroundColor: '#c0c0c0', // Standard Windows Gray
        border: '2px solid black',
        boxShadow: '2px 2px 0px black', // Retro shadow
        display: 'flex',
        flexDirection: 'column',
        ...propStyle // Merge passed styles (like display: none or zIndex overrides)
    };

    // If maximized, override dimensions
    if (maximized) {
        baseStyle.width = '100%';
        baseStyle.height = '100%';
        baseStyle.top = 0;
        baseStyle.left = 0;
        baseStyle.transform = 'none'; // Disable drag transform effect visually
    }

    const dragProps = maximized ? { disabled: true, position: { x: 0, y: 0 } } : { defaultPosition: initialPosition || { x: 100, y: 100 } };



    return (
        <Draggable
            handle=".title-bar"
            {...dragProps}
            nodeRef={nodeRef}
            onMouseDown={() => onFocus && onFocus(id)}
            cancel=".title-bar-controls button"
        >
            <div
                ref={nodeRef}
                className="window"
                style={baseStyle}
                onMouseDownCapture={() => onFocus && onFocus(id)}
            >
                <div className="title-bar" onDoubleClick={() => setMaximized(!maximized)}>
                    {icon ? (
                        React.isValidElement(icon) ? (
                            React.cloneElement(icon, { style: { width: '16px', height: '16px', marginRight: '4px', marginLeft: '2px' } })
                        ) : (
                            <img src={icon} alt="" style={{ width: '16px', height: '16px', marginRight: '4px', marginLeft: '2px' }} />
                        )
                    ) : (
                        <img src="/src/assets/images/4.png" alt="" style={{ width: '16px', marginRight: '4px', marginLeft: '2px' }} />
                    )}
                    <div className="title-bar-text">{title}</div>
                    <div className="title-bar-controls">

                        <button
                            title={maximized ? "Restore" : "Maximize"}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (resizable) setMaximized(!maximized);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`maximize-button ${!resizable ? 'disabled' : ''}`}
                            disabled={!resizable}
                        >
                            {maximized ? (
                                // Restore Icon (Two overlapping windows)
                                <svg width="10" height="10" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    {/* Background Window (Top Right) */}
                                    <path fillRule="evenodd" clipRule="evenodd" d="M3 0H10V7H9V2H3V0ZM10 2H3V1H10V2Z" fill="currentColor" />
                                    {/* Foreground Window (Bottom Left) */}
                                    <path fillRule="evenodd" clipRule="evenodd" d="M0 3H7V10H0V3ZM1 5H6V9H1V5ZM1 4H6V5H1V4Z" fill="currentColor" />
                                    {/* Correction for simple shapes: */}
                                    {/* Background: Rect at 3,0 size 7x7. Top 2px. */}
                                    {/* We can just draw paths for exact pixels. This 'path' logic is a bit complex to read. Let's use Rects. */}
                                </svg>
                            ) : (
                                // Maximize Icon (9x9 with 2px top)
                                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                                    {/* Top Move Bar (2px height) */}
                                    <rect x="0" y="0" width="9" height="2" fill="currentColor" />
                                    {/* Left Border */}
                                    <rect x="0" y="2" width="1" height="7" fill="currentColor" />
                                    {/* Right Border */}
                                    <rect x="8" y="2" width="1" height="7" fill="currentColor" />
                                    {/* Bottom Border */}
                                    <rect x="1" y="8" width="7" height="1" fill="currentColor" />
                                </svg>
                            )}
                            {maximized && (
                                // Restore (Overlapping) - Redoing for clarity/correctness
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute' }}>
                                    {/* Background Window (3,0 to 10,7) 7x7 */}
                                    <rect x="3" y="0" width="7" height="2" fill="currentColor" /> {/* Top */}
                                    <rect x="3" y="2" width="1" height="5" fill="currentColor" /> {/* Left */}
                                    <rect x="9" y="2" width="1" height="5" fill="currentColor" /> {/* Right */}
                                    <rect x="4" y="6" width="5" height="1" fill="currentColor" /> {/* Bottom */}

                                    {/* Foreground Window (0,3 to 7,10) 7x7 - Opaque center needed to hide back? Usually transparent in icon but let's see. 
                                       Actually in Win98 restore icon, the front window obscures the back one.
                                       So we need a fill or matte. But user said "icon color black, background gray".
                                       If we fill with gray, it might match button. 
                                   */}
                                    <rect x="0" y="3" width="7" height="7" fill="#c0c0c0" /> {/* Mask */}
                                    <rect x="0" y="3" width="7" height="2" fill="currentColor" /> {/* Front Top */}
                                    <rect x="0" y="5" width="1" height="5" fill="currentColor" /> {/* Front Left */}
                                    <rect x="6" y="5" width="1" height="5" fill="currentColor" /> {/* Front Right */}
                                    <rect x="1" y="9" width="5" height="1" fill="currentColor" /> {/* Front Bottom */}
                                </svg>
                            )}
                        </button>
                        <button
                            title="Close"
                            onClick={(e) => { e.stopPropagation(); onClose && onClose(id); }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="close-button"
                            style={{ marginLeft: '2px' }} // 2px gap
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
            </div>
        </Draggable>
    );
};

export default Window;
