import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import { useLanguage } from '../../context/LanguageContext';
import MenuBar from './MenuBar';
import { OpenDialog, SaveAsDialog } from './FileDialogs';
import { ensureExtension, fileKind, isImageDataUrl } from './fileTypes';
import { TEXT_SIZES, TEXT_FONTS, DEFAULT_TEXT_OPTIONS, fontString, drawText, fitContain } from './paintText';
import './Paint.css';

const PALETTE = [
    '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040',
    '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80'
];

const TOOLS = [
    { id: 'pencil', icon: '✏️' },
    { id: 'eraser', icon: '🧹' },
    { id: 'line', icon: '📏' },
    { id: 'rect', icon: '▭' },
    { id: 'rectFilled', icon: '▬' },
    { id: 'ellipse', icon: '⬭' },
    { id: 'ellipseFilled', icon: '⬤' },
    { id: 'fill', icon: '🪣' },
    { id: 'text', icon: 'A' },
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

const Paint = ({ initialFileId }) => {
    const { t } = useLanguage();
    const { getNode, createFile, updateFileContent, findFileByName, canStore } = useFileSystem();
    const containerRef = useRef(null);
    const textAreaRef = useRef(null);
    const canvasRef = useRef(null);
    const previewRef = useRef(null);
    const coordsElRef = useRef(null);

    const [tool, setTool] = useState('pencil');
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(3);
    const [textOptions, setTextOptions] = useState(DEFAULT_TEXT_OPTIONS);
    const [textBox, setTextBox] = useState(null); // { x, y, scale } while typing text on the canvas
    const [currentFileId, setCurrentFileId] = useState(initialFileId || null);
    const [showOpen, setShowOpen] = useState(false);
    const [showSaveAs, setShowSaveAs] = useState(false);
    const [saveAsError, setSaveAsError] = useState(null);
    const [status, setStatus] = useState('');

    // Mirrors of the UI state, read by the imperative mouse handlers below
    // (set up once on mount) so they always see the latest values without
    // needing to be re-bound on every tool/color/size change.
    const toolRef = useRef(tool);
    const colorRef = useRef(color);
    const brushSizeRef = useRef(brushSize);
    useEffect(() => { toolRef.current = tool; }, [tool]);
    useEffect(() => { colorRef.current = color; }, [color]);
    useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
    const textOptionsRef = useRef(textOptions);
    const textBoxRef = useRef(null);
    const commitTextRef = useRef(null);
    useEffect(() => { textOptionsRef.current = textOptions; }, [textOptions]);

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

    const openTextBox = useCallback((pos, scale) => {
        const box = { x: pos.x, y: pos.y, scale };
        textBoxRef.current = box;
        setTextBox(box);
    }, []);

    // Stamp the typed text onto the canvas (an empty box just disappears).
    const commitText = useCallback(() => {
        const box = textBoxRef.current;
        if (!box) return;
        const value = textAreaRef.current ? textAreaRef.current.value : '';
        textBoxRef.current = null;
        setTextBox(null);
        if (!value.trim()) return;
        drawText(canvasRef.current.getContext('2d'), {
            text: value, x: box.x, y: box.y, color: colorRef.current, ...textOptionsRef.current
        });
        pushHistory();
    }, [pushHistory]);

    const cancelText = useCallback(() => {
        textBoxRef.current = null;
        setTextBox(null);
    }, []);

    useEffect(() => { commitTextRef.current = commitText; }, [commitText]);

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

            // Text tool: finish any box that is still open, then start a new one here.
            // preventDefault keeps the canvas from stealing focus from the new text box.
            if (toolRef.current === 'text') {
                e.preventDefault();
                if (commitTextRef.current) commitTextRef.current();
                const rect = canvasRef.current.getBoundingClientRect();
                openTextBox(pos, rect.width / canvasRef.current.width);
                return;
            }

            if (containerRef.current) containerRef.current.focus({ preventScroll: true });
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
    }, [getPos, pushHistory, openTextBox]);

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

    // ---- files -------------------------------------------------------------
    const currentFile = currentFileId ? getNode(currentFileId) : null;
    const currentFileName = currentFile ? currentFile.name : t('pt.untitled');

    // Draw a saved picture onto the canvas (shrinking it to fit if it is larger).
    const loadDataUrl = useCallback((url) => new Promise((resolve, reject) => {
        if (!isImageDataUrl(url)) { reject(new Error('not an image')); return; }
        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const fit = fitContain(img.width, img.height, canvas.width, canvas.height);
                ctx.drawImage(img, fit.x, fit.y, fit.width, fit.height);
                pushHistory();
            }
            resolve();
        };
        img.onerror = () => reject(new Error('could not load'));
        img.src = url;
    }), [pushHistory]);

    // A picture handed over from My Computer.
    useEffect(() => {
        if (!initialFileId) return;
        const node = getNode(initialFileId);
        if (node) loadDataUrl(node.content).catch(() => setStatus(t('pt.badImage')));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const writeImage = (name) => {
        const url = canvasRef.current.toDataURL('image/png');
        if (!canStore(url.length)) return { error: t('pt.diskFull') };
        const finalName = ensureExtension(name, 'png');
        const existing = findFileByName('documents', finalName);
        if (existing) {
            updateFileContent(existing.id, url);
            return { id: existing.id };
        }
        return { id: createFile('documents', finalName, url) };
    };

    const handleSave = () => {
        commitText();
        if (!currentFileId) { setSaveAsError(null); setShowSaveAs(true); return; }
        const url = canvasRef.current.toDataURL('image/png');
        if (!canStore(url.length)) { setStatus(t('pt.diskFull')); return; }
        updateFileContent(currentFileId, url);
        setStatus(t('pt.saved'));
    };

    const handleSaveAs = () => { commitText(); setSaveAsError(null); setShowSaveAs(true); };

    const confirmSaveAs = (name) => {
        const result = writeImage(name);
        if (result.error) { setSaveAsError(result.error); return; }
        setCurrentFileId(result.id);
        setShowSaveAs(false);
        setStatus(t('pt.saved'));
    };

    const handleOpened = (node) => {
        setShowOpen(false);
        loadDataUrl(node.content)
            .then(() => { setCurrentFileId(node.id); setStatus(''); })
            .catch(() => setStatus(t('pt.badImage')));
    };

    const handleNew = () => {
        cancelText();
        handleClear();
        setCurrentFileId(null);
        setStatus('');
    };

    const handleDownload = () => {
        commitText();
        const url = canvasRef.current.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = ensureExtension(currentFileName, 'png', 'painting');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleKeyDown = (e) => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); handleSave(); }
        else if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); handleUndo(); }
    };

    const menus = [
        {
            id: 'file', label: t('pt.menu.file'), items: [
                { label: t('pt.new'), onSelect: handleNew },
                { label: t('pt.open'), onSelect: () => setShowOpen(true) },
                { label: t('pt.save'), shortcut: 'Ctrl+S', onSelect: handleSave },
                { label: t('pt.saveAs'), onSelect: handleSaveAs },
                { separator: true },
                { label: t('pt.download'), onSelect: handleDownload }
            ]
        },
        {
            id: 'edit', label: t('pt.menu.edit'), items: [
                { label: t('pt.undo'), shortcut: 'Ctrl+Z', onSelect: handleUndo },
                { label: t('pt.clearImage'), onSelect: handleClear }
            ]
        }
    ];

    const toolLabel = (id) => t(`pt.tool.${id}`);

    return (
        <div className="paint-container" ref={containerRef} tabIndex={-1} onKeyDown={handleKeyDown}>
            <MenuBar menus={menus}>
                <div className="paint-filename">{currentFileName}{currentFileId ? '' : t('pt.unsaved')}</div>
            </MenuBar>
            <div className="paint-toolbar">
                {TOOLS.map((def) => (
                    <button
                        key={def.id}
                        className={`paint-tool-btn ${tool === def.id ? 'active' : ''}`}
                        title={toolLabel(def.id)}
                        aria-label={toolLabel(def.id)}
                        aria-pressed={tool === def.id}
                        onClick={() => { if (def.id !== 'text') commitText(); setTool(def.id); }}
                    >
                        {def.icon}
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
                <button className="paint-action-btn" onClick={handleUndo} title={t('pt.undo')}>↩ {t('pt.undo')}</button>
                <button className="paint-action-btn" onClick={handleClear} title={t('pt.clearTitle')}>🗑 {t('pt.clear')}</button>
            </div>

            {tool === 'text' && (
                <div className="paint-textbar">
                    <label>
                        {t('pt.text.font')}
                        <select
                            value={textOptions.family}
                            onChange={(e) => setTextOptions({ ...textOptions, family: e.target.value })}
                        >
                            {Object.keys(TEXT_FONTS).map((f) => <option key={f} value={f}>{t(`pt.font.${f}`)}</option>)}
                        </select>
                    </label>
                    <label>
                        {t('pt.text.size')}
                        <select
                            value={textOptions.size}
                            onChange={(e) => setTextOptions({ ...textOptions, size: Number(e.target.value) })}
                        >
                            {TEXT_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            checked={textOptions.bold}
                            onChange={(e) => setTextOptions({ ...textOptions, bold: e.target.checked })}
                        />
                        {t('pt.text.bold')}
                    </label>
                </div>
            )}

            <div className="paint-body">
                <div className="paint-palette">
                    <div className="paint-current-color" style={{ backgroundColor: color }} title={t('pt.currentColor')} />
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
                        title={t('pt.customColor')}
                    />
                </div>

                <div className="paint-canvas-wrapper">
                    <canvas ref={canvasRef} width={700} height={480} className="paint-canvas" />
                    <canvas
                        ref={previewRef}
                        width={700}
                        height={480}
                        className="paint-canvas paint-preview-canvas"
                    />
                    {textBox && (
                        <textarea
                            ref={textAreaRef}
                            className="paint-text-input"
                            autoFocus
                            rows={1}
                            spellCheck="false"
                            aria-label={t('pt.tool.text')}
                            style={{
                                left: textBox.x * textBox.scale,
                                top: textBox.y * textBox.scale,
                                color,
                                font: fontString({ ...textOptions, size: textOptions.size * textBox.scale }),
                                lineHeight: 1.25
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
                                else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelText(); }
                            }}
                            onBlur={commitText}
                        />
                    )}
                </div>
            </div>

            <div className="paint-statusbar">
                <span>{t('pt.toolStatus', { tool: toolLabel(tool) })}{status ? ` | ${status}` : ''}</span>
                <span ref={coordsElRef}>0, 0</span>
            </div>

            {showOpen && (
                <OpenDialog
                    title={t('pt.openTitle')}
                    accept={(node) => fileKind(node.name) === 'image'}
                    onOpen={handleOpened}
                    onClose={() => setShowOpen(false)}
                />
            )}

            {showSaveAs && (
                <SaveAsDialog
                    title={t('pt.saveAsTitle')}
                    initialName={currentFileId ? currentFileName : t('pt.untitled')}
                    exists={(name) => Boolean(findFileByName('documents', ensureExtension(name, 'png')))}
                    error={saveAsError}
                    onSave={confirmSaveAs}
                    onCancel={() => setShowSaveAs(false)}
                />
            )}
        </div>
    );
};

export default Paint;
