// File-type helpers for the virtual file system (pure, unit-tested).

export const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];

export const extensionOf = (name) => {
    const match = /\.([a-z0-9]+)$/i.exec(String(name ?? ''));
    return match ? match[1].toLowerCase() : '';
};

// 'text' | 'image' | 'other'
export const fileKind = (name) => {
    const ext = extensionOf(name);
    if (ext === 'txt') return 'text';
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    return 'other';
};

// Windows-forbidden characters out, whitespace trimmed.
export const sanitizeFileName = (name) => String(name ?? '').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();

// "notes" -> "notes.txt", "notes.TXT" stays, "" -> "Untitled.txt"
export const ensureExtension = (name, ext, fallbackBase = 'Untitled') => {
    const clean = sanitizeFileName(name) || fallbackBase;
    return clean.toLowerCase().endsWith(`.${ext}`) ? clean : `${clean}.${ext}`;
};

// Only real image data URLs may be used as an <img> source / loaded into the canvas.
export const isImageDataUrl = (value) =>
    typeof value === 'string' && /^data:image\/(png|jpe?g|gif|webp|bmp);base64,[A-Za-z0-9+/=]+$/.test(value);
