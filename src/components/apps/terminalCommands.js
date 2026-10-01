// Pure command parsing/execution for the Terminal app. Returns a plain
// descriptor so the UI decides how to render it (and so it is unit-testable).

export const GITHUB_URL = 'https://github.com/gokalppo';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/gokalp-eker/';
export const RESUME_URL = '/resume.pdf';

export const HELP_LINES = [
    "Available Commands:",
    "  help     - Show this list",
    "  about    - Who made this?",
    "  clear    - Clear the terminal",
    "  date     - Show current date/time",
    "  ls       - List desktop apps",
    "  matrix   - Enter the matrix",
    "  neofetch - System Information",
    "  github   - Open my GitHub profile",
    "  linkedin - Open my LinkedIn profile",
    "  projects - List my projects",
    "  contact  - Show contact info",
    "  resume   - Open my resume"
];

const ABOUT_LINES = [
    "-----------------------------",
    " GOKALPPO - RETRO OS CREATOR ",
    "-----------------------------",
    "A passionate developer bringing",
    "nostalgia back to the web.",
    "Type 'github' or 'linkedin' to",
    "see the real thing."
];

const CONTACT_LINES = [
    "-----------------------------",
    " CONTACT",
    "-----------------------------",
    "Email:     ekergokalp@gmail.com",
    "GitHub:    github.com/gokalppo",
    "LinkedIn:  linkedin.com/in/gokalp-eker",
    "Instagram: instagram.com/_gokalpeker"
];

const PROJECT_LINES = [
    "-----------------------------",
    " PROJECTS (see also: Gallery)",
    "-----------------------------",
    "1. IoT Smart Air Quality",
    "   ESP32, MQ-135, DHT22 — real-time air",
    "   quality + temp/humidity monitoring,",
    "   WebSocket streaming, retro LCD UI.",
    "",
    "2. Hardware TOTP Token",
    "   Physical 2FA device from scratch —",
    "   OLED display, secure key storage,",
    "   battery powered.",
    "",
    "3. Document Scanner",
    "   C++ / OpenCV — corner detection,",
    "   perspective correction, OCR.",
    "",
    "4. AI Image Detector",
    "   ResNet18 model detecting AI-generated",
    "   images at 97.2% accuracy, Gradio UI."
];

const LS_LINES = [
    "Desktop/",
    "  My Computer",
    "  Recycle Bin",
    "  Notepad.exe",
    "  MusicPlayer.exe",
    "  Minesweeper.exe",
    "  Terminal.exe",
    "  resume.pdf"
];

export const parseCommand = (raw) => {
    const normalized = String(raw ?? '').trim().toLowerCase();
    const [name = '', ...args] = normalized.split(/\s+/);
    return { normalized, name, args };
};

const text = (lines) => ({ type: 'text', lines });
const open = (url, label) => ({ type: 'open', url, lines: [`Opening ${label} ...`] });

// Result types: text | open | clear | matrix | neofetch | heart | crash | empty
export const executeCommand = (raw, now = new Date()) => {
    const { normalized, name } = parseCommand(raw);

    if (normalized.startsWith('sudo')) {
        return text(["Nice try, but you don't have root privileges!"]);
    }

    switch (name) {
        case '': return { type: 'empty' };
        case 'help': return text(HELP_LINES);
        case 'about': return text(ABOUT_LINES);
        case 'github': return open(GITHUB_URL, GITHUB_URL);
        case 'linkedin': return open(LINKEDIN_URL, LINKEDIN_URL);
        case 'resume':
        case 'cv': return open(RESUME_URL, 'resume.pdf');
        case 'contact': return text(CONTACT_LINES);
        case 'projects': return text(PROJECT_LINES);
        case 'ls': return text(LS_LINES);
        case 'date': return text([now.toLocaleString()]);
        case 'clear': return { type: 'clear' };
        case 'matrix': return { type: 'matrix' };
        case 'neofetch': return { type: 'neofetch' };
        case 'ece': return { type: 'heart' };
        case 'crash': return { type: 'crash' };
        default: return text([`Command not found: ${normalized}`]);
    }
};
