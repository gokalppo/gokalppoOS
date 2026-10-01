// Pure command parsing/execution for the Terminal app. Returns a plain
// descriptor so the UI decides how to render it (and so it is unit-testable).
import { PROJECTS } from '../../data/projects';
import { localized } from '../../i18n/translate';
import { tokenize, fsCommand, writeRedirect, promptFor, applyOpsToNodes, FS_COMMANDS } from './shellFs';
import { filterCommand, FILTER_COMMANDS } from './shellFilters';
import { splitLine } from './shellLine';
import { formatHistory } from './terminalHistory';
import { systemCommand, SYSTEM_COMMANDS, suggestCommand, sudoUsage } from './shellSystem';
import { manPage } from './shellMan';
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
        "  history    - Show the commands you typed",
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
        "System:",
        "  man        - Manual page of a command (also: help ls)",
        "  whoami     - Who you are on this machine",
        "  hostname   - The machine name",
        "  uname      - System name (-a for details)",
        "  ver        - gokalppoOS version",
        "  uptime     - How long this desktop has been running",
        "  ping       - Ping a host (a simulation)",
        "  theme      - Terminal colors (theme amber)",
        "  exit       - Close this Terminal",
        "Just for fun:",
        "  cowsay     - A cow says your text",
        "  fortune    - A programmer's fortune",
        "  weather    - A (simulated) weather report",
        "  sl         - A steam locomotive",
        "  hack       - Look busy",
        "  fakeinstall - A fake installer",
        "  love       - A little heart (love Ayşe adds a name)",
        "  sudo       - Try your luck",
        "Filters (work after a |, or on a file):",
        "  grep       - Keep matching lines (-i -v -c -n)",
        "  head       - First lines (-n 5)",
        "  tail       - Last lines (-n 5)",
        "  sort       - Sort lines (-r reverse)",
        "  wc         - Count lines, words, characters",
        "Tips: Tab completes, Up/Down recall, Ctrl+C cancels, Ctrl+L clears.",
        "Chain with && or ;  -  pipe with |  -  put names with spaces in \"quotes\"."
    ],
    tr: [
        "Kullanılabilir Komutlar:",
        "  help       - Bu listeyi göster",
        "  about      - Bunu kim yaptı?",
        "  clear      - Terminali temizle",
        "  date       - Tarih/saati göster",
        "  echo       - Metin yazdır (echo merhaba > a.txt kaydeder)",
        "  history    - Yazdığın komutları göster",
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
        "Sistem:",
        "  man        - Bir komutun kılavuzu (help ls de olur)",
        "  whoami     - Bu makinede kim olduğun",
        "  hostname   - Makine adı",
        "  uname      - Sistem adı (-a ayrıntı)",
        "  ver        - gokalppoOS sürümü",
        "  uptime     - Bu masaüstü ne zamandır açık",
        "  ping       - Bir adrese ping at (simülasyon)",
        "  theme      - Terminal renkleri (theme amber)",
        "  exit       - Bu Terminal'i kapat",
        "Eğlence:",
        "  cowsay     - Bir inek metnini söyler",
        "  fortune    - Yazılımcı falı",
        "  weather    - (Simüle) hava durumu",
        "  sl         - Buharlı lokomotif",
        "  hack       - Meşgul görün",
        "  fakeinstall - Sahte yükleyici",
        "  love       - Küçük bir kalp (love Ayşe isim ekler)",
        "  sudo       - Şansını dene",
        "Filtreler (| sonrasında veya bir dosyada çalışır):",
        "  grep       - Eşleşen satırları tut (-i -v -c -n)",
        "  head       - İlk satırlar (-n 5)",
        "  tail       - Son satırlar (-n 5)",
        "  sort       - Satırları sırala (-r ters)",
        "  wc         - Satır, kelime, karakter say",
        "İpuçları: Tab tamamlar, Yukarı/Aşağı geçmişi getirir, Ctrl+C iptal eder, Ctrl+L temizler.",
        "&& veya ; ile zincirle  -  | ile boruya ver  -  boşluklu adları \"tırnak\" içine al."
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
        notFound: (cmd) => `Command not found: ${cmd}`,
        badRedirect: "Missing file name after '>'",
        didYouMean: (c) => `Did you mean: ${c}?`,
        opening: (label) => `Opening ${label} ...`
    },
    tr: {
        notFound: (cmd) => `Komut bulunamadı: ${cmd}`,
        badRedirect: "'>' işaretinden sonra dosya adı eksik",
        didYouMean: (c) => `Şunu mu demek istedin: ${c}?`,
        opening: (label) => `${label} açılıyor ...`
    }
};

export const parseCommand = (raw) => {
    const normalized = String(raw ?? '').trim().toLowerCase();
    const [name = '', ...args] = normalized.split(/\s+/);
    return { normalized, name, args };
};

const text = (lines) => ({ type: 'text', lines });

// `love Ayşe` puts a name under the heart; anything that is not a letter, space, hyphen or apostrophe is dropped.
const cleanName = (value) => String(value).replace(/[^\p{L}\s'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24);

// Result types: text | open | clear | matrix | neofetch | heart | crash | empty.
// A text result may also carry `ops` (file-system changes), `cwd` (new folder), `appId` (program to open)
// and `closeIds` (windows to close) for the Terminal to carry out.
// env: { programs, nodes, cwd, windows, canStore } - everything the shell needs to know about the OS.
// "Command not found", plus the closest real command when it looks like a typo.
const unknownCommand = (name, normalized, m, env) => {
    const candidates = [...COMMAND_NAMES, ...(env.programs || []).map((p) => p.id)];
    const guess = suggestCommand(name, candidates);
    return { type: 'text', lines: [m.notFound(normalized), ...(guess ? [m.didYouMean(guess)] : [])], error: true };
};

export const executeCommand = (raw, now = new Date(), lang = 'en', env = {}) => {
    const { normalized } = parseCommand(raw);
    const m = MESSAGES[lang] || MESSAGES.en;
    const open = (url, label) => ({ type: 'open', url, lines: [m.opening(label)] });
    const pick = (table) => table[lang] || table.en;

    const { words, redirect, dangling } = tokenize(raw);
    const name = (words[0] || '').toLowerCase();
    const args = words.slice(1);
    const ctx = { ...env, lang, now, cwd: env.cwd || 'root' };

    if (dangling && name) return { type: 'text', lines: [m.badRedirect], error: true };

    const run = () => {
        switch (name) {
            case '': return { type: 'empty' };
            case 'help': return args.length ? manPage(args[0], lang) : text(pick(HELP));
            case 'man': return manPage(args[0], lang);
            case 'sudo': return args.length
                ? { type: 'sudo', command: args.join(' '), lines: [] }
                : { type: 'text', lines: [sudoUsage(lang)], error: true };
            case 'about': return text(pick(ABOUT));
            case 'github': return open(GITHUB_URL, GITHUB_URL);
            case 'linkedin': return open(LINKEDIN_URL, LINKEDIN_URL);
            case 'resume':
            case 'cv': return open(RESUME_URL, 'resume.pdf');
            case 'contact': return text(pick(CONTACT));
            case 'projects': return text(projectLines(lang));
            case 'echo': return text([args.join(' ')]);
            case 'history': return text(formatHistory(env.history || []));
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
            case 'love':
            case 'kalp': return { type: 'heart', name: cleanName(args.join(' ')) };
            case 'crash': return { type: 'crash' };
            default:
                return fsCommand(name, args, ctx)
                    || filterCommand(name, args, ctx)
                    || systemCommand(name, args, ctx)
                    || programCommand(name, args, ctx)
                    || unknownCommand(name, normalized, m, env);
        }
    };

    const result = run();

    // `command > file` / `command >> file` saves whatever a command printed.
    if (redirect && result.type === 'text' && !result.error && !(result.ops && result.ops.length)) {
        return writeRedirect(result.lines.filter((l) => typeof l === 'string'), redirect, ctx);
    }
    return result;
};

// Command names for Tab completion (the hidden easter eggs are left out).
export const COMMAND_NAMES = [
    'help', 'about', 'clear', 'cls', 'date', 'echo', 'history', 'matrix', 'neofetch', 'github', 'linkedin',
    'projects', 'contact', 'resume', 'cv', 'love', 'kalp', 'apps', 'start', 'open', 'tasklist', 'kill', 'taskkill', 'man', 'sudo',
    ...FS_COMMANDS, ...FILTER_COMMANDS, ...SYSTEM_COMMANDS
];

// Runs a whole line: `a && b`, `a ; b` and `a | b | c`. Returns one result per segment so the Terminal
// can show them in order. `&&` stops at the first failed segment; each segment sees the file changes
// and folder moves of the ones before it.
export const executeLine = (raw, now = new Date(), lang = 'en', env = {}) => {
    const results = [];
    let nodes = env.nodes;
    let cwd = env.cwd || 'root';

    for (const segment of splitLine(raw)) {
        let stdin;
        let result = { type: 'empty' };
        let aborted = false;

        for (let i = 0; i < segment.stages.length; i++) {
            const last = i === segment.stages.length - 1;
            result = executeCommand(segment.stages[i], now, lang, { ...env, nodes, cwd, stdin: i > 0 ? stdin : undefined });
            if (!last) {
                if (result.error) { aborted = true; break; }
                stdin = result.type === 'text' ? result.lines.filter((l) => typeof l === 'string') : [];
            }
        }

        results.push(result);
        if (nodes && result.ops && result.ops.length) nodes = applyOpsToNodes(nodes, result.ops);
        if (result.cwd) cwd = result.cwd;
        if (segment.op === '&&' && (aborted || result.error)) break;
    }

    const shown = results.filter((r) => r.type !== 'empty');
    return shown.length ? shown : [{ type: 'empty' }];
};
