import React, { useEffect, useRef, useState } from 'react';
import './ScreenSaver.css';

const IDLE_TIMEOUT = 120000; // 2 dakika hareketsizlik sonrası devreye girer
const STAR_COUNT = 400;
const SPEED = 9;
const IDLE_EVENTS = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];

const ScreenSaver = () => {
    const [active, setActive] = useState(false);
    const canvasRef = useRef(null);
    const idleTimer = useRef(null);
    const animationRef = useRef(null);
    const starsRef = useRef([]);

    // Idle detection: belli süre etkileşim olmazsa ekran koruyucuyu devreye sok.
    useEffect(() => {
        const resetTimer = () => {
            if (idleTimer.current) clearTimeout(idleTimer.current);
            idleTimer.current = setTimeout(() => setActive(true), IDLE_TIMEOUT);
        };

        IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
        resetTimer();

        return () => {
            if (idleTimer.current) clearTimeout(idleTimer.current);
            IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
        };
    }, []);

    // Aktifken herhangi bir etkileşimde kapat.
    useEffect(() => {
        if (!active) return;
        const dismiss = () => setActive(false);
        IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, dismiss));
        return () => {
            IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, dismiss));
        };
    }, [active]);

    // Warp-speed yıldız tüneli animasyonu
    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        starsRef.current = Array.from({ length: STAR_COUNT }, () => ({
            x: (Math.random() - 0.5) * canvas.width,
            y: (Math.random() - 0.5) * canvas.height,
            z: Math.random() * canvas.width
        }));

        const draw = () => {
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            starsRef.current.forEach((star) => {
                const prevZ = star.z;
                star.z -= SPEED;
                if (star.z <= 1) {
                    star.x = (Math.random() - 0.5) * canvas.width;
                    star.y = (Math.random() - 0.5) * canvas.height;
                    star.z = canvas.width;
                    return;
                }

                const k = 128 / star.z;
                const sx = star.x * k + cx;
                const sy = star.y * k + cy;
                if (sx < 0 || sx >= canvas.width || sy < 0 || sy >= canvas.height) return;

                const prevK = 128 / prevZ;
                const px = star.x * prevK + cx;
                const py = star.y * prevK + cy;

                const size = Math.max(0.5, (1 - star.z / canvas.width) * 3);
                ctx.strokeStyle = '#9fffb0';
                ctx.lineWidth = size;
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(sx, sy);
                ctx.stroke();
            });

            animationRef.current = requestAnimationFrame(draw);
        };

        animationRef.current = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(animationRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [active]);

    if (!active) return null;

    return (
        <div className="screensaver-overlay">
            <canvas ref={canvasRef} className="screensaver-canvas" />
            <div className="screensaver-label">gokalppoOS</div>
        </div>
    );
};

export default ScreenSaver;
