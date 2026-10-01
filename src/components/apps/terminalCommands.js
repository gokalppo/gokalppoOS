// Pure command parsing/execution for the Terminal app. Returns a plain
// descriptor so the UI decides how to render it (and so it is unit-testable).
import { PROJECTS } from '../../data/projects';
import { localized } from '../../i18n/translate';
import { tokenize, fsCommand, writeRedirect, promptFor } from './shellFs';
import { appsLines, programCommand, startCommand, tasklistCommand, killCommand } from './shellApps';

export { promptFor, appsLines };

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
        "  help       - Show this list",
        "  about      - Who made this?",
        "  clear      - Clear the terminal",
        "  date       - Show current date/time",
        "  echo       - Print text (echo hi > a.txt saves it)",
        "  matrix     - Enter the matrix",
        "  neofetch   - System Information",
        "  github     - Open my GitHub profile",
        "  linkedin   - Open my LinkedIn profile",
        "  projects   - List my projects",
        "  contact    - Show contact info",
        "  resume     - Open my resume",
        "Files (the same ones as My Computer):",
        "  ls         - List a folder (-l for details)",
        "  pwd        - Show the current folder",
        "  cd         - Change folder (cd .. goes up)",
        "  tree       - Show folders as a tree",
        "  cat        - Print a text file",
        "  mkdir      - Create a folder",
        "  touch      - Create an empty text file",
        "  cp         - Copy a file",
        "  mv         - Move or rename",
        "  rm         - Move to Recycle Bin (-r folders)",
        "Programs:",
        "  apps       - List installed programs",
        "  start      - Open a program or file",
        "  notepad    - Open Notepad (notepad notes.txt)",
        "  paint      - Open Paint (paint picture.png)",
        "  tasklist   - List open windows",
        "  kill       - Close a window (kill notepad)",
        "Tip: put names with spaces in \"quotes\"."
    ],
    tr: [
        "Kullanılabilir Komutlar:",
        "  help       - Bu listeyi göster",
        "  about      - Bunu kim yaptı?",
        "  clear      - Terminali temizle",
        "  date       - Tarih/saati göster",
        "  echo       - Metin yazdır (echo merhaba > a.txt kaydeder)",
        "  matrix     - Matrix'e gir",
        "  neofetch   - Sistem bilgisi",
        "  github     - GitHub profilimi aç",
        "  linkedin   - LinkedIn profilimi aç",
        "  projects   - Projelerimi listele",
        "  contact    - İletişim bilgileri",
        "  resume     - Özgeçmişimi aç",
        "Dosyalar (My Computer'dakilerle aynı):",
        "  ls         - Klasörü listele (-l ayrıntı)",
        "  pwd        - Bulunduğun klasörü göster",
        "  cd         - Klasör değiştir (cd .. yukarı çıkar)",
        "  tree       - Klasörleri ağaç olarak göster",
        "  cat        - Metin dosyasını yazdır",
        "  mkdir      - Klasör oluştur",
        "  touch      - Boş metin dosyası oluştur",
        "  cp         - Dosya kopyala",
        "  mv         - Taşı veya yeniden adlandır",
        "  rm         - Geri Dönüşüm Kutusu'na taşı (-r klasör)",
        "Programlar:",
        "  apps       - Yüklü programları listele",
        "  start      - Program veya dosya aç",
        "  notepad    - Notepad'i aç (notepad notlar.txt)",
        "  paint      - Paint'i aç (paint resim.png)",
        "  tasklist   - Açık pencereleri listele",
        "  kill       - Pencereyi kapat (kill notepad)",
        "İpucu: boşluklu adları \"tırnak\" içine al."
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

const MESSAGES = {
    en: {
        sudo: "Nice try, but you don't have root privileges!",
        notFound: (cmd) => `Command not found: ${cmd}`,
        badRedirect: "Missing file name after '>'",
        opening: (label) => `Opening ${label} ...`
    },
    tr: {
        sudo: "İyi denemeydi ama root yetkin yok!",
        notFound: (cmd) => `Komut bulunamadı: ${cmd}`,
        badRedirect: "'>' işaretinden sonra dosya adı eksik",
        opening: (label) => `${label} açılıyor ...`
    }
};

export const parseCommand = (raw) => {
    const normalized = String(raw ?? '').trim().toLowerCase();
    const [name = '', ...args] = normalized.split(/\s+/);
    return { normalized, name, args };
};

const text = (lines) => ({ type: 'text', lines });

// Result types: text | open | clear | matrix | neofetch | heart | crash | empty.
// A text result may also carry `ops` (file-system changes), `cwd` (new folder), `appId` (program to open)
// and `closeIds` (windows to close) for the Terminal to carry out.
// env: { programs, nodes, cwd, windows, canStore } - everything the shell needs to know about the OS.
export const executeCommand = (raw, now = new Date(), lang = 'en', env = {}) => {
    const { normalized } = parseCommand(raw);
    const m = MESSAGES[lang] || MESSAGES.en;
    const open = (url, label) => ({ type: 'open', url, lines: [m.opening(label)] });
    const pick = (table) => table[lang] || table.en;

    if (normalized.startsWith('sudo')) {
        return text([m.sudo]);
    }

    const { words, redirect, dangling } = tokenize(raw);
    const name = (words[0] || '').toLowerCase();
    const args = words.slice(1);
    const ctx = { ...env, lang, cwd: env.cwd || 'root' };

    if (dangling && name) return { type: 'text', lines: [m.badRedirect], error: true };

    const run = () => {
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
            case 'echo': return text([args.join(' ')]);
            case 'apps':
            case 'programs': return text(appsLines(env.programs, lang));
            case 'start':
            case 'open': return startCommand(name, args, ctx);
            case 'tasklist': return tasklistCommand(ctx);
            case 'kill':
            case 'taskkill': return killCommand(name, args, ctx);
            case 'date': return text([now.toLocaleString(lang)]);
            case 'clear':
            case 'cls': return { type: 'clear' };
            case 'matrix': return { type: 'matrix' };
            case 'neofetch': return { type: 'neofetch' };
            case 'ece': return { type: 'heart' };
            case 'crash': return { type: 'crash' };
            default:
                return fsCommand(name, args, ctx)
                    || programCommand(name, args, ctx)
                    || { type: 'text', lines: [m.notFound(normalized)], error: true };
        }
    };

    const result = run();

    // `command > file` / `command >> file` saves whatever a command printed.
    if (redirect && result.type === 'text' && !result.error && !(result.ops && result.ops.length)) {
        return writeRedirect(result.lines, redirect, ctx);
    }
    return result;
};
