import React, { useEffect, useRef, useState } from 'react';
import { useDisplay } from '../context/DisplayContext';
import { saverDelayMs } from '../display/displayConfig';
import { makePolygon, stepPolygon } from '../display/mystify';
import { prefersReducedMotion } from '../display/motion';
import './ScreenSaver.css';

const STAR_COUNT = 400;
const SPEED = 9;
const IDLE_EVENTS = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];
const DISMISS_GRACE_MS = 500; // ignore the click/mouse jitter that triggered a preview

const runStarfield = (canvas, ctx) => {
    let frame;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: STAR_COUNT }, () => ({
        x: (Math.random() - 0.5) * canvas.width,
        y: (Math.random() - 0.5) * canvas.height,
        z: Math.random() * canvas.width
    }));

    const draw = () => {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        stars.forEach((star) => {
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
            ctx.strokeStyle = '#9fffb0';
            ctx.lineWidth = Math.max(0.5, (1 - star.z / canvas.width) * 3);
            ctx.beginPath();
            ctx.moveTo(star.x * prevK + cx, star.y * prevK + cy);
            ctx.lineTo(sx, sy);
            ctx.stroke();
        });
        frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
};

const runMystify = (canvas, ctx) => {
    let frame;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    let polygons = [makePolygon(canvas.width, canvas.height), makePolygon(canvas.width, canvas.height)];

    const drawShape = (points, style) => {
        ctx.strokeStyle = style;
        ctx.beginPath();
        points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
    };

    const draw = () => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        polygons = polygons.map((poly) => stepPolygon(poly, canvas.width, canvas.height));
        polygons.forEach((poly) => {
            poly.trail.forEach((shape, i) => {
                drawShape(shape, `hsla(${poly.hue}, 100%, 60%, ${(i + 1) / (poly.trail.length + 1)})`);
            });
            drawShape(poly.points, `hsl(${poly.hue}, 100%, 70%)`);
        });
        frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
};

const ScreenSaver = () => {
    const { display } = useDisplay();
    const { saver, saverMinutes } = display;
    const enabled = saver !== 'none' && !prefersReducedMotion();
    const [active, setActive] = useState(false);
    const [previewSaver, setPreviewSaver] = useState(null); // saver being previewed from Display Properties
    const canvasRef = useRef(null);

    // Idle detection.
    useEffect(() => {
        if (!enabled) return;
        let timer;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => setActive(true), saverDelayMs(saverMinutes));
        };
        IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
        resetTimer();
        return () => {
            clearTimeout(timer);
            IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
        };
    }, [enabled, saverMinutes]);

    // "Preview" button in Display Properties.
    useEffect(() => {
        const preview = (e) => {
            if (prefersReducedMotion()) return;
            setPreviewSaver(e.detail?.saver || null);
            setActive(true);
        };
        window.addEventListener('screensaver-preview', preview);
        return () => window.removeEventListener('screensaver-preview', preview);
    }, []);

    // Any input dismisses it (after a short grace period).
    useEffect(() => {
        if (!active) return;
        const dismiss = () => { setActive(false); setPreviewSaver(null); };
        const arm = setTimeout(() => IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, dismiss)), DISMISS_GRACE_MS);
        return () => {
            clearTimeout(arm);
            IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, dismiss));
        };
    }, [active]);

    // Animation.
    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        return (previewSaver || saver) === 'mystify' ? runMystify(canvas, ctx) : runStarfield(canvas, ctx);
    }, [active, saver, previewSaver]);

    if (!active) return null;

    return (
        <div className="screensaver-overlay" aria-hidden="true">
            <canvas ref={canvasRef} className="screensaver-canvas" />
            {(previewSaver || saver) !== 'mystify' && <div className="screensaver-label">gokalppoOS</div>}
        </div>
    );
};

export default ScreenSaver;
