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

const Paint = () => {
    const canvasRef = useRef(null);
    const previewRef = useRef(null);
    const containerRef = useRef(null);

    const [tool, setTool] = useState('pencil');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [isDrawing, setIsDrawing] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const startPoint = useRef({ x: 0, y: 0 });
    const history = useRef([]);

    // Initialize canvas: white background
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        pushHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pushHistory = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const snapshot = canvas.toDataURL();
        history.current.push(snapshot);
        if (history.current.length > MAX_HISTORY) {
            history.current.shift();
        }
    }, []);

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

    const getPos = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.round(((e.clientX - rect.left) / rect.width) * canvas.width),
            y: Math.round(((e.clientY - rect.top) / rect.height) * canvas.height)
        };
    };

    // Flood fill (iterative, avoids stack overflow on big canvases)
    const floodFill = (startX, startY, fillColorHex) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const hexToRgba = (hex) => {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b, 255];
        };

        const idx = (x, y) => (y * width + x) * 4;
        const startIdx = idx(startX, startY);
        const target = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
        const fill = hexToRgba(fillColorHex);

        if (target[0] === fill[0] && target[1] === fill[1] && target[2] === fill[2] && target[3] === fill[3]) {
            return; // already that color
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

    const drawShapePreview = (from, to) => {
        const preview = previewRef.current;
        const ctx = preview.getContext('2d');
        ctx.clearRect(0, 0, preview.width, preview.height);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';

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

    const commitShape = (from, to) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';

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

        const preview = previewRef.current;
        preview.getContext('2d').clearRect(0, 0, preview.width, preview.height);
    };

    const handleMouseDown = (e) => {
        const pos = getPos(e);
        startPoint.current = pos;
        setIsDrawing(true);

        if (tool === 'fill') {
            floodFill(pos.x, pos.y, color);
            pushHistory();
            setIsDrawing(false);
            return;
        }

        if (tool === 'pencil' || tool === 'eraser') {
            const ctx = canvasRef.current.getContext('2d');
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    };

    const handleMouseMove = (e) => {
        const pos = getPos(e);
        setCoords(pos);
        if (!isDrawing) return;

        if (tool === 'pencil' || tool === 'eraser') {
            const ctx = canvasRef.current.getContext('2d');
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        } else if (['line', 'rect', 'rectFilled', 'ellipse', 'ellipseFilled'].includes(tool)) {
            drawShapePreview(startPoint.current, pos);
        }
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) return;
        setIsDrawing(false);

        if (['line', 'rect', 'rectFilled', 'ellipse', 'ellipseFilled'].includes(tool)) {
            const pos = getPos(e);
            commitShape(startPoint.current, pos);
        }

        if (tool !== 'fill') {
            pushHistory();
        }
    };

    return (
        <div className="paint-container" ref={containerRef}>
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
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => isDrawing && setIsDrawing(false)}
                    />
                </div>
            </div>

            <div className="paint-statusbar">
                <span>Tool: {TOOLS.find((t) => t.id === tool)?.label}</span>
                <span>{coords.x}, {coords.y}</span>
            </div>
        </div>
    );
};

export default Paint;
