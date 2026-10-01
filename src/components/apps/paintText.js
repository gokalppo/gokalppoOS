// Text-tool helpers for Paint (pure apart from the canvas context they draw on).

export const TEXT_SIZES = [12, 16, 24, 36];

export const TEXT_FONTS = {
    sans: 'Arial, Helvetica, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: '"Courier New", Courier, monospace',
    pixel: 'gokalppoOS, sans-serif'
};

export const DEFAULT_TEXT_OPTIONS = { size: 16, family: 'sans', bold: false };

export const fontString = ({ size, family, bold }) =>
    `${bold ? 'bold ' : ''}${size}px ${TEXT_FONTS[family] || TEXT_FONTS.sans}`;

export const LINE_HEIGHT_FACTOR = 1.25;

// Splits typed text into lines, dropping trailing blank lines (a stray final Enter).
export const textLines = (text) => {
    const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
    return lines;
};

export const lineHeightFor = (size) => Math.round(size * LINE_HEIGHT_FACTOR);

// Draws multi-line text with its top-left corner at (x, y). Returns how many lines were drawn.
export const drawText = (ctx, { text, x, y, color, size, family, bold }) => {
    const lines = textLines(text);
    if (lines.length === 0) return 0;
    ctx.font = fontString({ size, family, bold });
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const lineHeight = lineHeightFor(size);
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
    return lines.length;
};

// Scale a saved/loaded image to fit inside the canvas without distortion (never enlarging it).
export const fitContain = (imageWidth, imageHeight, canvasWidth, canvasHeight) => {
    if (!imageWidth || !imageHeight) return { x: 0, y: 0, width: 0, height: 0 };
    const scale = Math.min(1, canvasWidth / imageWidth, canvasHeight / imageHeight);
    const width = Math.round(imageWidth * scale);
    const height = Math.round(imageHeight * scale);
    return { x: Math.round((canvasWidth - width) / 2), y: Math.round((canvasHeight - height) / 2), width, height };
};
