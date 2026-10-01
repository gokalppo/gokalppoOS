import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Clippy.css';
import { useLanguage } from '../context/LanguageContext';
import { getClippyTips } from '../i18n/clippyTips';

const resolveCategory = (TIPS, openWindows, focusedWindowId) => {
    const win = openWindows.find((w) => w.id === focusedWindowId);
    if (!win) return 'default';
    if (win.id === 'computer') return 'mycomputer';
    if (win.id === 'recycle') return 'recyclebin';
    if (TIPS[win.id]) return win.id;
    if (win.title && win.title.toLowerCase().endsWith('.txt')) return 'notepad';
    return 'default';
};

const Clippy = ({ openWindows, focusedWindowId }) => {
    const { lang, t } = useLanguage();
    const TIPS = getClippyTips(lang);
    const [visible, setVisible] = useState(false);
    const [bubbleOpen, setBubbleOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [blinking, setBlinking] = useState(false);
    const lastCategoryRef = useRef(null);
    const eyesRef = useRef(null);
    const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });

    const showTipForCategory = useCallback((category) => {
        const pool = TIPS[category] || TIPS.default;
        const text = pool[Math.floor(Math.random() * pool.length)];
        setMessage(text);
        setBubbleOpen(true);
    }, [TIPS]);

    // Appear shortly after boot, with a friendly greeting.
    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(true);
            showTipForCategory('default');
        }, 2500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // React to the user opening a different app (not every refocus of the same one).
    useEffect(() => {
        if (!visible) return;
        const category = resolveCategory(TIPS, openWindows, focusedWindowId);
        if (category !== lastCategoryRef.current) {
            lastCategoryRef.current = category;
            if (focusedWindowId) showTipForCategory(category);
        }
    }, [TIPS, openWindows, focusedWindowId, visible, showTipForCategory]);

    // Idle blink animation.
    useEffect(() => {
        const interval = setInterval(() => {
            setBlinking(true);
            setTimeout(() => setBlinking(false), 160);
        }, 3200 + Math.random() * 2000);
        return () => clearInterval(interval);
    }, []);

    // Eyes follow the cursor, classic Clippy touch.
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!eyesRef.current) return;
            const rect = eyesRef.current.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dx = e.clientX - cx;
            const dy = e.clientY - cy;
            const angle = Math.atan2(dy, dx);
            const dist = Math.min(2.2, Math.hypot(dx, dy) / 60);
            setPupilOffset({ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    if (!visible) return null;

    const category = resolveCategory(TIPS, openWindows, focusedWindowId);

    return (
        <div className="clippy-root">
            {bubbleOpen && (
                <div className="clippy-bubble">
                    <button className="clippy-bubble-close" onClick={() => setBubbleOpen(false)} title={t('clippy.close')}>×</button>
                    <div className="clippy-bubble-text">{message}</div>
                </div>
            )}
            <div
                className="clippy-character"
                onClick={() => showTipForCategory(category)}
                title={t('clippy.click')}
            >
                <button
                    className="clippy-dismiss"
                    onClick={(e) => { e.stopPropagation(); setVisible(false); }}
                    title={t('clippy.hide')}
                >×</button>
                <svg viewBox="0 0 110 160" width="66" height="96" className="clippy-svg">
                    <defs>
                        <linearGradient id="clippyMetal" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#f5f5f5" />
                            <stop offset="45%" stopColor="#c3cad2" />
                            <stop offset="55%" stopColor="#8a97a5" />
                            <stop offset="100%" stopColor="#eef1f3" />
                        </linearGradient>
                    </defs>
                    {/* Outer wire: long vertical loop, rounded top */}
                    <path
                        d="M28 150
                           L28 35
                           C28 16, 43 4, 62 4
                           C81 4, 94 16, 94 34
                           C94 50, 83 60, 68 60
                           L68 118"
                        fill="none"
                        stroke="url(#clippyMetal)"
                        strokeWidth="10"
                        strokeLinecap="round"
                    />
                    {/* Inner wire: shorter loop nested inside */}
                    <path
                        d="M46 128
                           L46 40
                           C46 28, 54 22, 64 22
                           C74 22, 80 28, 80 36"
                        fill="none"
                        stroke="url(#clippyMetal)"
                        strokeWidth="10"
                        strokeLinecap="round"
                    />
                    <g ref={eyesRef} className={blinking ? 'clippy-eyes blinking' : 'clippy-eyes'}>
                        <path d="M40 38 Q48 28 57 36" fill="none" stroke="#2b2b2b" strokeWidth="3.2" strokeLinecap="round" />
                        <path d="M63 36 Q72 27 80 35" fill="none" stroke="#2b2b2b" strokeWidth="3.2" strokeLinecap="round" />
                        <ellipse cx="49" cy="48" rx="7.5" ry="8.5" fill="#fff" stroke="#2b2b2b" strokeWidth="2" />
                        <ellipse cx="72" cy="47" rx="7.5" ry="8.5" fill="#fff" stroke="#2b2b2b" strokeWidth="2" />
                        <circle cx={49 + pupilOffset.x} cy={49 + pupilOffset.y} r="3.2" fill="#1a1a1a" />
                        <circle cx={72 + pupilOffset.x} cy={48 + pupilOffset.y} r="3.2" fill="#1a1a1a" />
                    </g>
                </svg>
            </div>
        </div>
    );
};

export default Clippy;
