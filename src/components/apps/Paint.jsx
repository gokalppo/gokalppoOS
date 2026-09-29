import React, { useRef, useState, useEffect, useCallback } from 'react';
import './Paint.css';

const PALETTE = [
    '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80'
];

const TOOLS = [
    { id: 'pencil', label: 'Pencil', icon: '✏️' },
    { id: 'eraser', label: 'Eraser', icon: '🧹' },
    { id: 'line', label: 'Line', icon: '📏' },
    { id: 'rect', label: 'Rectangle', icon: '▭' },
    { id: 'rectFilled', label: 'Filled Rectangle', icon: '▬' },
    { id: 'ellipse', label: 'Ellipse', icon: '⬭' },
    { id: 'ellipseFilled', label: 'Filled Ellipse', icon: '⬤' },
    { id: 'fill', label: 'Fill', icon: '🪣' },
];

const SIZES = [1, 3, 6];
const MAX_HISTORY = 20;
const SHAPE_TOOLS = ['line', 'rect', 'rectFilled', 'ellipse', 'ellipseFilled'];

// --- Pure drawing helpers (take everything they need as params, no closures
// over React state, so they behave the same whether called from a fresh
// event or a stale one). ---

const hexToRgba = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255
];

const floodFill = (canvas, startX, startY, fillColorHex) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const idx = (x, y) => (y * width + x) * 4;
    const startIdx = idx(startX, startY);
    const target = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
    const fill = hexToRgba(fillColorHex);

    if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2] && target[3] === fill[3]) {
        return;
    }

    const matches = (i) =>
        data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] === target[3];

    const stack = [[startX, startY]];
    while (stack.length) {
        const [x, y] = stack.pop();
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const i = idx(x, y);
        if (!matches(i)) continue;

        data[i] = fill[0];
        data[i + 1] = fill[1];
        data[i + 2] = fill[2];
        data[i + 3] = fill[3];

        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
};

const paintShape = (ctx, tool, from, to) => {
    if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    } else if (tool === 'rect' || tool === 'rectFilled') {
        const x = Math.min(from.x, to.x);
        const y = Math.min(from.y, to.y);
        const w = Math.abs(to.x - from.x);
        const h = Math.abs(to.y - from.y);
        if (tool === 'rectFilled') ctx.fillRect(x, y, w, h);
        else ctx.strokeRect(x, y, w, h);
    } else if (tool === 'ellipse' || tool === 'ellipseFilled') {
        const cx = (from.x + to.x) / 2;
        const cy = (from.y + to.y) / 2;
        const rx = Math.abs(to.x - from.x) / 2;
        const ry = Math.abs(to.y - from.y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (tool === 'ellipseFilled') ctx.fill();
        else ctx.stroke();
    }
};

const drawShapePreview = (previewCanvas, tool, from, to, color, brushSize) => {
    const ctx = previewCanvas.getContext('2d');
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    paintShape(ctx, tool, from, to);
};

const commitShape = (canvas, previewCanvas, tool, from, to, color, brushSize) => {
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    paintShape(ctx, tool, from, to);

    previewCanvas.getContext('2d').clearRect(0, 0, previewCanvas.width, previewCanvas.height);
};

const Paint = () => {
    const canvasRef = useRef(null);
    const previewRef = useRef(null);
    const coordsElRef = useRef(null);

    const [tool, setTool] = useState('pencil');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);

    // Mirrors of the UI state, read by the imperative mouse handlers below
    // (set up once on mount) so they always see the latest values without
    // needing to be re-bound on every tool/color/size change.
    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const brushSizeRef = useRef(brushSize);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

    const isDrawingRef = useRef(false);
    const startPointRef = useRef({ x: 0, y: 0 });
    const history = useRef([]);

    const pushHistory = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        history.current.push(canvas.toDataURL());
        if (history.current.length > MAX_HISTORY) history.current.shift();
    }, []);

    // Initialize canvas: white background
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        pushHistory();
    }, [pushHistory]);

    const getPos = useCallback((clientX, clientY) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.round(((clientX - rect.left) / rect.width) * canvas.width),
            y: Math.round(((clientY - rect.top) / rect.height) * canvas.height)
        };
    }, []);

    // Mouse handling lives entirely outside React state: mousemove/mouseup
    // are bound on `window` (not just the canvas) so a stroke or shape drag
    // that briefly leaves the small canvas area doesn't get silently
    // dropped, and coordinates are written straight to the DOM instead of
    // going through setState so drawing never triggers a re-render.
    useEffect(() => {
        const preview = previewRef.current;

        const handleDown = (e) => {
            const pos = getPos(e.clientX, e.clientY);
            startPointRef.current = pos;
            isDrawingRef.current = true;

            const currentTool = toolRef.current;
            if (currentTool === 'fill') {
                floodFill(canvasRef.current, pos.x, pos.y, colorRef.current);
                pushHistory();
                isDrawingRef.current = false;
                return;
            }

            if (currentTool === 'pencil' || currentTool === 'eraser') {
                const ctx = canvasRef.current.getContext('2d');
                ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : colorRef.current;
                ctx.lineWidth = currentTool === 'eraser' ? brushSizeRef.current * 3 : brushSizeRef.current;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            }
        };

        const handleMove = (e) => {
            const pos = getPos(e.clientX, e.clientY);
            if (coordsElRef.current) {
                coordsElRef.current.textContent = `${pos.x}, ${pos.y}`;
            }
            if (!isDrawingRef.current) return;

            const currentTool = toolRef.current;
            if (currentTool === 'pencil' || currentTool === 'eraser') {
                const ctx = canvasRef.current.getContext('2d');
                ctx.lineTo(pos.x, pos.y);
                ctx.stroke();
            } else if (SHAPE_TOOLS.includes(currentTool)) {
                drawShapePreview(previewRef.current, currentTool, startPointRef.current, pos, colorRef.current, brushSizeRef.current);
            }
        };

        const handleUp = (e) => {
            if (!isDrawingRef.current) return;
            isDrawingRef.current = false;

            const currentTool = toolRef.current;
            if (SHAPE_TOOLS.includes(currentTool)) {
                const pos = getPos(e.clientX, e.clientY);
                commitShape(canvasRef.current, previewRef.current, currentTool, startPointRef.current, pos, colorRef.current, brushSizeRef.current);
            }
            if (currentTool !== 'fill') {
                pushHistory();
            }
        };

        preview.addEventListener('mousedown', handleDown);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);

        return () => {
            preview.removeEventListener('mousedown', handleDown);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [getPos, pushHistory]);

    const handleUndo = () => {
        if (history.current.length <= 1) return;
        history.current.pop(); // discard current state
        const prev = history.current[history.current.length - 1];
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
        };
        img.src = prev;
    };

    const handleClear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        pushHistory();
    };

    const handleSave = () => {
        const canvas = canvasRef.current;
        const url = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'painting.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="paint-container">
            <div className="paint-toolbar">
                {TOOLS.map((t) => (
                    <button
                        key={t.id}
                        className={`paint-tool-btn ${tool === t.id ? 'active' : ''}`}
                        title={t.label}
                        onClick={() => setTool(t.id)}
                    >
                        {t.icon}
                    </button>
                ))}
                <div className="paint-toolbar-divider" />
                {SIZES.map((s) => (
                    <button
                        key={s}
                        className={`paint-size-btn ${brushSize === s ? 'active' : ''}`}
                        title={`${s}px`}
                        onClick={() => setBrushSize(s)}
                    >
                        <span className="paint-size-dot" style={{ width: s * 2, height: s * 2 }} />
                    </button>
                ))}
                <div className="paint-toolbar-divider" />
                <button className="paint-action-btn" onClick={handleUndo} title="Undo">↩ Undo</button>
                <button className="paint-action-btn" onClick={handleClear} title="Clear canvas">🗑 Clear</button>
                <button className="paint-action-btn" onClick={handleSave} title="Save as PNG">💾 Save</button>
            </div>

            <div className="paint-body">
                <div className="paint-palette">
                    <div className="paint-current-color" style={{ backgroundColor: color }} title="Current color" />
                    <div className="paint-palette-grid">
                        {PALETTE.map((c) => (
                            <button
                                key={c}
                                className={`paint-swatch ${color === c ? 'active' : ''}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setColor(c)}
                                title={c}
                            />
                        ))}
                    </div>
                    <input
                        type="color"
                        className="paint-custom-color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        title="Custom color"
                    />
                </div>

                <div className="paint-canvas-wrapper">
                    <canvas ref={canvasRef} width={500} height={350} className="paint-canvas" />
                    <canvas
                        ref={previewRef}
                        width={500}
                        height={350}
                        className="paint-canvas paint-preview-canvas"
                    />
                </div>
            </div>

            <div className="paint-statusbar">
                <span>Tool: {TOOLS.find((t) => t.id === tool)?.label}</span>
                <span ref={coordsElRef}>0, 0</span>
            </div>
        </div>
    );
};

export default Paint;
