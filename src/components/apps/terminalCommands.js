// Pure command parsing/execution for the Terminal app. Returns a plain
// descriptor so the UI decides how to render it (and so it is unit-testable).
import { PROJECTS } from '../../data/projects';
import { localized } from '../../i18n/translate';

export const GITHUB_URL = 'https://github.com/gokalppo';
export const LINKEDIN_URL = 'https://www.linkedin.com/in/gokalp-eker/';
export const RESUME_URL = '/resume.pdf';

const wrap = (text, width = 38) => {
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
        if (line && (line + ' ' + word).length > width) {
            lines.push(line);
            line = word;
        } else {
            line = line ? `${line} ${word}` : word;
        }
    }
    if (line) lines.push(line);
    return lines;
};

const HELP = {
    en: [
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
    ],
    tr: [
        "Kullanılabilir Komutlar:",
        "  help     - Bu listeyi göster",
        "  about    - Bunu kim yaptı?",
        "  clear    - Terminali temizle",
        "  date     - Tarih/saati göster",
        "  ls       - Masaüstü uygulamalarını listele",
        "  matrix   - Matrix'e gir",
        "  neofetch - Sistem bilgisi",
        "  github   - GitHub profilimi aç",
        "  linkedin - LinkedIn profilimi aç",
        "  projects - Projelerimi listele",
        "  contact  - İletişim bilgileri",
        "  resume   - Özgeçmişimi aç"
    ]
};

export const HELP_LINES = HELP.en;

const ABOUT = {
    en: [
        "-----------------------------",
        " GOKALPPO - RETRO OS CREATOR ",
        "-----------------------------",
        "A passionate developer bringing",
        "nostalgia back to the web.",
        "Type 'github' or 'linkedin' to",
        "see the real thing."
    ],
    tr: [
        "-----------------------------",
        " GOKALPPO - RETRO OS YAPIMCISI ",
        "-----------------------------",
        "Nostaljiyi web'e geri getiren",
        "tutkulu bir geliştirici.",
        "Gerçeğini görmek için 'github'",
        "veya 'linkedin' yazın."
    ]
};

const CONTACT = {
    en: [
        "-----------------------------",
        " CONTACT",
        "-----------------------------",
        "Email:     ekergokalp@gmail.com",
        "GitHub:    github.com/gokalppo",
        "LinkedIn:  linkedin.com/in/gokalp-eker",
        "Instagram: instagram.com/_gokalpeker"
    ],
    tr: [
        "-----------------------------",
        " İLETİŞİM",
        "-----------------------------",
        "E-posta:   ekergokalp@gmail.com",
        "GitHub:    github.com/gokalppo",
        "LinkedIn:  linkedin.com/in/gokalp-eker",
        "Instagram: instagram.com/_gokalpeker"
    ]
};

const projectLines = (lang) => {
    const header = lang === 'tr'
        ? ["-----------------------------", " PROJELER (bkz: Gallery)", "-----------------------------"]
        : ["-----------------------------", " PROJECTS (see also: Gallery)", "-----------------------------"];
    const body = PROJECTS.flatMap((p, i) => [
        ...(i > 0 ? [""] : []),
        `${i + 1}. ${p.title}`,
        ...wrap(localized(p.summary, lang)).map((l) => `   ${l}`)
    ]);
    return [...header, ...body];
};

// System folders show up as plain names, every other program is an .exe, like the real Desktop.
const FOLDER_IDS = ['mycomputer', 'recyclebin'];

export const lsLines = (programs = []) => {
    const entry = ({ id, title }) => (FOLDER_IDS.includes(id) ? title : `${title.replace(/\s/g, '')}.exe`);
    return ["Desktop/", ...programs.map((p) => `  ${entry(p)}`), "  resume.pdf"];
};

const MESSAGES = {
    en: {
        sudo: "Nice try, but you don't have root privileges!",
        notFound: (cmd) => `Command not found: ${cmd}`,
        opening: (label) => `Opening ${label} ...`
    },
    tr: {
        sudo: "İyi denemeydi ama root yetkin yok!",
        notFound: (cmd) => `Komut bulunamadı: ${cmd}`,
        opening: (label) => `${label} açılıyor ...`
    }
};

export const parseCommand = (raw) => {
    const normalized = String(raw ?? '').trim().toLowerCase();
    const [name = '', ...args] = normalized.split(/\s+/);
    return { normalized, name, args };
};

const text = (lines) => ({ type: 'text', lines });

// Result types: text | open | clear | matrix | neofetch | heart | crash | empty
export const executeCommand = (raw, now = new Date(), lang = 'en', programs = []) => {
    const { normalized, name } = parseCommand(raw);
    const m = MESSAGES[lang] || MESSAGES.en;
    const open = (url, label) => ({ type: 'open', url, lines: [m.opening(label)] });
    const pick = (table) => table[lang] || table.en;

    if (normalized.startsWith('sudo')) {
        return text([m.sudo]);
    }

    switch (name) {
        case '': return { type: 'empty' };
        case 'help': return text(pick(HELP));
        case 'about': return text(pick(ABOUT));
        case 'github': return open(GITHUB_URL, GITHUB_URL);
        case 'linkedin': return open(LINKEDIN_URL, LINKEDIN_URL);
        case 'resume':
        case 'cv': return open(RESUME_URL, 'resume.pdf');
        case 'contact': return text(pick(CONTACT));
        case 'projects': return text(projectLines(lang));
        case 'ls': return text(lsLines(programs));
        case 'date': return text([now.toLocaleString(lang)]);
        case 'clear': return { type: 'clear' };
        case 'matrix': return { type: 'matrix' };
        case 'neofetch': return { type: 'neofetch' };
        case 'ece': return { type: 'heart' };
        case 'crash': return { type: 'crash' };
        default: return text([m.notFound(normalized)]);
    }
};
