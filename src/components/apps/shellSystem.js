// "System" and "fun" commands for the Terminal: whoami, uname, ping, cowsay, fortune, theme, hack ...
// Pure: they return result descriptors (text lines, `stream` for slow output, `{ live }` lines that
// replace the previous live line) and never touch the DOM, the clock or Math.random directly.
import { THEME_NAMES, isTheme, DEFAULT_THEME } from './terminalThemes';

export const OS_VERSION = '1.0.4';
export const HOSTNAME = 'gokalppo-pc';
export const USER_NAME = 'guest';

const out = (lines, extra = {}) => ({ type: 'text', lines, ...extra });
const fail = (message) => ({ type: 'text', lines: [message], error: true });

const MSG = {
    en: {
        pingUsage: 'Usage: ping <host>   (try: ping gokalppo.me)',
        pingNoHost: (h) => `Ping request could not find host ${h}. Please check the name and try again.`,
        pinging: (h, ip) => `Pinging ${h} [${ip}] with 32 bytes of data:`,
        reply: (ip, ms) => `Reply from ${ip}: bytes=32 time=${ms}ms TTL=57`,
        stats: (ip) => `Ping statistics for ${ip}:`,
        packets: '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),',
        roundTrip: 'Approximate round trip times in milli-seconds:',
        minMax: (a, b, c) => `    Minimum = ${a}ms, Maximum = ${b}ms, Average = ${c}ms`,
        simulated: '(simulation: no packets left your browser)',
        uptime: (d, h, m, s) => `System up time: ${d} day(s), ${h}:${m}:${s}`,
        themeNow: (n) => `Current theme: ${n}`,
        themeList: (names) => `Available themes: ${names.join(', ')}   (try: theme amber)`,
        themeSet: (n) => `Theme changed to ${n}.`,
        themeBad: (n) => `Unknown theme: ${n}. Available: ${THEME_NAMES.join(', ')}`,
        weatherTitle: (city) => `Weather report: ${city}`,
        weatherSim: '(simulated: always fine inside gokalppoOS)',
        sudoUsage: 'usage: sudo <command>',
        sudoPrompt: `[sudo] password for ${USER_NAME}:`,
        sudoRetry: 'Sorry, try again.',
        sudoFail: 'sudo: 3 incorrect password attempts',
        sudoNope: "Nice try, but you don't have root privileges!",
        hackSteps: ['Connecting to the mainframe...', 'Bypassing the firewall...', 'Decrypting passwords...'],
        hackDone: 'Access granted. Just kidding - nothing was touched.',
        installTitle: 'Installing gokalppoOS-extras v9.9.9',
        installPackages: ['libcoffee.dll', 'sparkle.sys', 'definitely-not-malware.exe', 'more-ram.zip'],
        installDone: 'Done. Nothing was actually installed.',
        exit: 'Closing this Terminal...'
    },
    tr: {
        pingUsage: 'Kullanım: ping <adres>   (dene: ping gokalppo.me)',
        pingNoHost: (h) => `Ping isteği ${h} adresini bulamadı. Adı kontrol edip tekrar dene.`,
        pinging: (h, ip) => `${h} [${ip}] adresine 32 bayt veri ile ping atılıyor:`,
        reply: (ip, ms) => `${ip} yanıtı: bayt=32 süre=${ms}ms TTL=57`,
        stats: (ip) => `${ip} için ping istatistikleri:`,
        packets: '    Paketler: Gönderilen = 4, Alınan = 4, Kayıp = 0 (%0 kayıp),',
        roundTrip: 'Milisaniye cinsinden yaklaşık gidiş dönüş süreleri:',
        minMax: (a, b, c) => `    En az = ${a}ms, En çok = ${b}ms, Ortalama = ${c}ms`,
        simulated: '(simülasyon: tarayıcından dışarı hiçbir paket çıkmadı)',
        uptime: (d, h, m, s) => `Sistem çalışma süresi: ${d} gün, ${h}:${m}:${s}`,
        themeNow: (n) => `Geçerli tema: ${n}`,
        themeList: (names) => `Kullanılabilir temalar: ${names.join(', ')}   (dene: theme amber)`,
        themeSet: (n) => `Tema ${n} olarak değiştirildi.`,
        themeBad: (n) => `Bilinmeyen tema: ${n}. Seçenekler: ${THEME_NAMES.join(', ')}`,
        weatherTitle: (city) => `Hava durumu raporu: ${city}`,
        weatherSim: '(simüle: gokalppoOS içinde hava hep güzel)',
        sudoUsage: 'kullanım: sudo <komut>',
        sudoPrompt: `[sudo] ${USER_NAME} için parola:`,
        sudoRetry: 'Üzgünüm, tekrar dene.',
        sudoFail: 'sudo: 3 hatalı parola denemesi',
        sudoNope: 'İyi denemeydi ama root yetkin yok!',
        hackSteps: ['Ana bilgisayara bağlanılıyor...', 'Güvenlik duvarı aşılıyor...', 'Parolalar çözülüyor...'],
        hackDone: 'Erişim sağlandı. Şaka şaka - hiçbir şeye dokunulmadı.',
        installTitle: 'gokalppoOS-extras v9.9.9 yükleniyor',
        installPackages: ['libcoffee.dll', 'sparkle.sys', 'kesinlikle-virus-degil.exe', 'daha-fazla-ram.zip'],
        installDone: 'Bitti. Aslında hiçbir şey yüklenmedi.',
        exit: 'Terminal kapatılıyor...'
    }
};

const FORTUNES = {
    en: [
        'It works on my machine.',
        'There are only two hard things in computer science: cache invalidation, naming things, and off-by-one errors.',
        'A good programmer looks both ways before crossing a one-way street.',
        'Weeks of coding can save you hours of planning.',
        'Real programmers count from zero.',
        'The cloud is just someone else\'s computer.',
        'Have you tried turning it off and on again?',
        'First, solve the problem. Then, write the code.',
        'Debugging is being the detective in a crime movie where you are also the murderer.',
        'Never trust a computer you can\'t throw out of a window.',
        'Today is a good day to commit.',
        'Ctrl+S is a lifestyle.'
    ],
    tr: [
        'Bende çalışıyor.',
        'Bilgisayar biliminde sadece iki zor şey var: önbellek geçersiz kılma, isim koymak ve bir eksik/fazla hataları.',
        'İyi bir programcı tek yönlü sokağı geçerken iki yana da bakar.',
        'Haftalarca kod yazmak, saatlerce plan yapmaktan seni kurtarabilir.',
        'Gerçek programcılar sıfırdan sayar.',
        'Bulut, başkasının bilgisayarından ibarettir.',
        'Kapatıp tekrar açmayı denedin mi?',
        'Önce problemi çöz. Sonra kodu yaz.',
        'Hata ayıklamak, katilin de sen olduğun bir polisiye filmde dedektif olmaktır.',
        'Pencereden fırlatamayacağın bir bilgisayara asla güvenme.',
        'Bugün commit atmak için güzel bir gün.',
        'Ctrl+S bir yaşam tarzıdır.'
    ]
};

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
const pad2 = (n) => String(n).padStart(2, '0');

// A made-up but stable address for a host name.
const fakeIp = (host) => {
    const h = hash(host);
    return `${[104, 172, 188][h % 3]}.${(h >>> 3) % 250 + 2}.${(h >>> 11) % 250 + 2}.${(h >>> 19) % 250 + 2}`;
};

export const describeBrowser = (ua = '') => {
    const browser = /Edg\//.test(ua) ? 'Edge'
        : /OPR\/|Opera/.test(ua) ? 'Opera'
            : /Firefox\//.test(ua) ? 'Firefox'
                : /Chrome\//.test(ua) ? 'Chrome'
                    : /Safari\//.test(ua) ? 'Safari' : 'a browser';
    const os = /Windows/.test(ua) ? 'Windows'
        : /Android/.test(ua) ? 'Android'
            : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
                : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
                    : /Linux/.test(ua) ? 'Linux' : 'an unknown OS';
    return { browser, os };
};

export const formatUptime = (ms, lang = 'en') => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return (MSG[lang] || MSG.en).uptime(d, h, pad2(m), pad2(s));
};

// Levenshtein distance, for "Did you mean ...?".
const distance = (a, b) => {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        let prev = row[0];
        row[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const tmp = row[j];
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
            prev = tmp;
        }
    }
    return row[b.length];
};

export const suggestCommand = (word, candidates = []) => {
    const w = String(word).toLowerCase();
    if (!w) return null;
    const limit = w.length <= 4 ? 1 : 2;
    let best = null;
    [...new Set(candidates)].sort().forEach((c) => {
        const d = distance(w, c);
        if (d > 0 && d <= limit && (!best || d < best.d)) best = { c, d };
    });
    return best ? best.c : null;
};

// ---------------------------------------------------------------------------
// sudo: a fake password prompt that always says no
// ---------------------------------------------------------------------------

export const sudoPrompt = (lang = 'en') => (MSG[lang] || MSG.en).sudoPrompt;

// Reply to the n-th (1-based) wrong password.
export const sudoReply = (attempt, lang = 'en') => {
    const m = MSG[lang] || MSG.en;
    return attempt < 3 ? { lines: [m.sudoRetry], done: false } : { lines: [m.sudoFail, m.sudoNope], done: true };
};

// ---------------------------------------------------------------------------
// commands
// ---------------------------------------------------------------------------

const cowsay = (text) => {
    const words = String(text).trim().split(/\s+/).filter(Boolean);
    const rows = [];
    let line = '';
    words.forEach((w) => {
        if (line && (line + ' ' + w).length > 28) { rows.push(line); line = w; } else line = line ? `${line} ${w}` : w;
    });
    if (line) rows.push(line);
    const width = Math.max(...rows.map((r) => r.length), 1);
    const bubble = rows.length === 1
        ? [`< ${rows[0].padEnd(width)} >`]
        : rows.map((r, i) => {
            const [l, rr] = i === 0 ? ['/', '\\'] : i === rows.length - 1 ? ['\\', '/'] : ['|', '|'];
            return `${l} ${r.padEnd(width)} ${rr}`;
        });
    return [
        ` ${'_'.repeat(width + 2)}`,
        ...bubble,
        ` ${'-'.repeat(width + 2)}`,
        '        \\   ^__^',
        '         \\  (oo)\\_______',
        '            (__)\\       )\\/\\',
        '                ||----w |',
        '                ||     ||'
    ];
};

const progressBar = (pct) => {
    const filled = Math.round(pct / 10);
    return `[${'#'.repeat(filled)}${'.'.repeat(10 - filled)}] ${pct}%`;
};

const progressLines = () => Array.from({ length: 11 }, (_, i) => ({ live: progressBar(i * 10) }));

const WEATHER = {
    en: ['Sunny', 'Partly cloudy', 'A light breeze', 'Clear skies'],
    tr: ['Güneşli', 'Parçalı bulutlu', 'Hafif esintili', 'Açık gökyüzü']
};

const titleCase = (s) => s.replace(/\b\p{L}/gu, (c) => c.toLocaleUpperCase());

// Returns a result, or null when `name` is not one of these commands.
// ctx: { lang, now, random, stdin, uptimeMs, theme, userAgent }
export const systemCommand = (name, args, ctx) => {
    const lang = ctx.lang || 'en';
    const m = MSG[lang] || MSG.en;
    const random = ctx.random || Math.random;

    switch (name) {
        case 'whoami': return out([USER_NAME]);
        case 'hostname': return out([HOSTNAME]);
        case 'ver': return out([`gokalppoOS [Version ${OS_VERSION} Retro Edition]`]);
        case 'uname':
            return out([args.includes('-a')
                ? `GokalpOS ${HOSTNAME} ${OS_VERSION} React/Vite i686 g-sh`
                : 'GokalpOS']);
        case 'uptime': return out([formatUptime(ctx.uptimeMs ?? 0, lang)]);
        case 'exit': return out([m.exit], { closeIds: ['terminal'] });
        case 'sl': return { type: 'train' };

        case 'ping': {
            const host = args.find((a) => !a.startsWith('-'));
            if (!host) return fail(m.pingUsage);
            const isLocal = host.toLowerCase() === 'localhost';
            if (!isLocal && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) return fail(m.pingNoHost(host));
            const ip = isLocal ? '127.0.0.1' : fakeIp(host.toLowerCase());
            const base = isLocal ? 0 : 12 + (hash(host) % 25);
            const times = [0, 1, 2, 3].map((i) => (isLocal ? 0 : base + ((hash(host + i) % 9) - 3)));
            const min = Math.min(...times);
            const max = Math.max(...times);
            const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
            return out([
                m.pinging(host, ip),
                ...times.map((t) => m.reply(ip, t)),
                '',
                m.stats(ip),
                m.packets,
                m.roundTrip,
                m.minMax(min, max, avg),
                m.simulated
            ], { stream: { delay: 450 } });
        }

        case 'fortune': {
            const list = FORTUNES[lang] || FORTUNES.en;
            return out([list[Math.floor(random() * list.length)]]);
        }

        case 'cowsay': {
            const text = args.length ? args.join(' ') : (ctx.stdin ? ctx.stdin.filter((l) => typeof l === 'string').join(' ') : '');
            return out(cowsay(text || 'Moo!'));
        }

        case 'weather': {
            const city = titleCase(args.join(' ').trim() || 'Istanbul');
            const h = hash(city + (ctx.now ? ctx.now.toDateString() : ''));
            const sky = (WEATHER[lang] || WEATHER.en)[h % 4];
            const temp = 12 + (h % 18);
            return out([
                m.weatherTitle(city),
                '',
                '    \\   /       ' + sky,
                '     .-.        ' + `${temp} °C`,
                '  ― (   ) ―     ' + `${5 + (h % 20)} km/h`,
                '     `-’',
                '    /   \\',
                '',
                m.weatherSim
            ]);
        }

        case 'theme': {
            const wanted = (args[0] || '').toLowerCase();
            if (!wanted) return out([m.themeNow(ctx.theme || DEFAULT_THEME), m.themeList(THEME_NAMES)]);
            if (!isTheme(wanted)) return fail(m.themeBad(wanted));
            return out([m.themeSet(wanted)], { theme: wanted });
        }

        case 'hack':
            return out([...m.hackSteps.flatMap((step) => [step]), ...progressLines(), m.hackDone], { stream: { delay: 140 } });

        case 'fakeinstall':
            return out([
                m.installTitle,
                ...m.installPackages.flatMap((p) => [`  + ${p}`]),
                ...progressLines(),
                m.installDone
            ], { stream: { delay: 140 } });

        default:
            return null;
    }
};

export const SYSTEM_COMMANDS = [
    'whoami', 'hostname', 'ver', 'uname', 'uptime', 'exit', 'sl', 'ping', 'fortune', 'cowsay', 'weather', 'theme', 'hack', 'fakeinstall'
];

export const sudoUsage = (lang = 'en') => (MSG[lang] || MSG.en).sudoUsage;
