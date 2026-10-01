// Pure program-launching commands for the Terminal: apps, start/open, notepad/paint <file>,
// tasklist and kill. Like shellFs, they return descriptors the Terminal carries out.
import { fileKind, extensionOf, sanitizeFileName } from './fileTypes';
import { resolvePath, splitTarget, newId } from './shellFs';

const MSG = {
    en: {
        installed: 'Installed programs:',
        usageStart: (c) => `Usage: ${c} <program or file>   (try: apps)`,
        notFound: (c, p) => `${c}: Cannot find "${p}" (try: apps)`,
        isFolder: (c, p) => `${c}: ${p}: Is a folder - use cd to enter it`,
        noProgram: (c, p) => `${c}: ${p}: No program is associated with this file type`,
        notText: (c, p) => `${c}: ${p}: Not a text file`,
        notImage: (c, p) => `${c}: ${p}: Not a picture file`,
        badName: (c, p) => `${c}: ${p}: Invalid file name`,
        created: (p) => `Created ${p}`,
        starting: (label) => `Starting ${label} ...`,
        taskHeader: '  PID  Window                    State',
        running: 'Running',
        minimized: 'Minimized',
        noTasks: 'No windows are open.',
        usageKill: (c) => `Usage: ${c} <window name or PID>   (try: tasklist)`,
        noTask: (c, p) => `${c}: No such window: ${p} (try: tasklist)`,
        killed: (title, pid) => `Terminated: ${title} (PID ${pid})`
    },
    tr: {
        installed: 'Yüklü programlar:',
        usageStart: (c) => `Kullanım: ${c} <program veya dosya>   (dene: apps)`,
        notFound: (c, p) => `${c}: "${p}" bulunamadı (dene: apps)`,
        isFolder: (c, p) => `${c}: ${p}: Bu bir klasör - girmek için cd kullan`,
        noProgram: (c, p) => `${c}: ${p}: Bu dosya türüne bağlı bir program yok`,
        notText: (c, p) => `${c}: ${p}: Metin dosyası değil`,
        notImage: (c, p) => `${c}: ${p}: Resim dosyası değil`,
        badName: (c, p) => `${c}: ${p}: Geçersiz dosya adı`,
        created: (p) => `${p} oluşturuldu`,
        starting: (label) => `${label} başlatılıyor ...`,
        taskHeader: '  PID  Pencere                   Durum',
        running: 'Çalışıyor',
        minimized: 'Simge durumunda',
        noTasks: 'Açık pencere yok.',
        usageKill: (c) => `Kullanım: ${c} <pencere adı veya PID>   (dene: tasklist)`,
        noTask: (c, p) => `${c}: Böyle bir pencere yok: ${p} (dene: tasklist)`,
        killed: (title, pid) => `Sonlandırıldı: ${title} (PID ${pid})`
    }
};

const out = (lines, extra = {}) => ({ type: 'text', lines, ...extra });

// Window/program ids are the lower-cased title without spaces, so "Internet Explorer" -> "internetexplorer".
export const normalizeProgramName = (s) => String(s).toLowerCase().replace(/\.exe$/, '').replace(/[\s_-]/g, '');

const ALIASES = {
    ie: 'internetexplorer', iexplore: 'internetexplorer', explorer: 'mycomputer', computer: 'mycomputer',
    trash: 'recyclebin', bin: 'recyclebin', mspaint: 'paint', cmd: 'terminal', msn: 'messenger',
    music: 'musicplayer', mine: 'minesweeper', mines: 'minesweeper', about: 'aboutme', cv: 'myresume', resume: 'myresume'
};

export const findProgram = (programs, name) => {
    const n = normalizeProgramName(name);
    const id = ALIASES[n] || n;
    return (programs || []).find((p) => p.id === id) || null;
};

const FOLDER_IDS = ['mycomputer', 'recyclebin'];

// What `apps` prints: system folders as plain names, everything else as an .exe.
export const appsLines = (programs = [], lang = 'en') => {
    const entry = ({ id, title }) => (FOLDER_IDS.includes(id) ? title : `${title.replace(/\s/g, '')}.exe`);
    return [(MSG[lang] || MSG.en).installed, ...programs.map((p) => `  ${entry(p)}`)];
};

const launchApp = (program, m) => out([m.starting(program.title)], { appId: program.id });

// notepad / paint with a file argument (or no argument: just the program).
const launchWithFile = (program, filePath, ctx, name) => {
    const { nodes, cwd, lang } = ctx;
    const m = MSG[lang] || MSG.en;
    const wanted = program.id === 'paint' ? 'image' : 'text';
    if (!filePath) return launchApp(program, m);
    if (!nodes) return launchApp(program, m);

    const node = resolvePath(nodes, cwd, filePath);
    if (node) {
        if (node.type === 'folder') return out([m.isFolder(name, filePath)], { error: true });
        if (fileKind(node.name) !== wanted) {
            return out([wanted === 'image' ? m.notImage(name, filePath) : m.notText(name, filePath)], { error: true });
        }
        return out([m.starting(node.name)], { ops: [{ op: 'open', id: node.id, name: node.name }] });
    }

    // Notepad offers to create a missing file; Paint cannot open one that does not exist.
    if (wanted === 'image') return out([m.notFound(name, filePath)], { error: true });
    const target = splitTarget(nodes, cwd, filePath);
    const clean = target && sanitizeFileName(target.name);
    if (!target || !target.parent) return out([m.notFound(name, filePath)], { error: true });
    if (!clean || clean !== target.name.trim()) return out([m.badName(name, target.name)], { error: true });
    const fileName = extensionOf(clean) ? clean : `${clean}.txt`;
    return out([m.created(fileName)], {
        ops: [{ op: 'create', id: newId(), parentId: target.parent.id, name: fileName, content: '', open: true }]
    });
};

// `paint`, `notepad notes.txt`, `ie` ... a program name typed as a command.
export const programCommand = (name, args, ctx) => {
    const program = findProgram(ctx.programs, name);
    if (!program) return null;
    if (program.id === 'notepad' || program.id === 'paint') {
        return launchWithFile(program, args.join(' '), ctx, name);
    }
    return launchApp(program, MSG[ctx.lang] || MSG.en);
};

// `start x` / `open x`: x may be a program ("internet explorer", "paint") or a file.
export const startCommand = (name, args, ctx) => {
    const m = MSG[ctx.lang] || MSG.en;
    if (!args.length) return out([m.usageStart(name)], { error: true });

    const whole = args.join(' ');
    const wholeProgram = findProgram(ctx.programs, whole);
    if (wholeProgram) return launchApp(wholeProgram, m);

    const first = findProgram(ctx.programs, args[0]);
    if (first && args.length > 1 && (first.id === 'notepad' || first.id === 'paint')) {
        return launchWithFile(first, args.slice(1).join(' '), ctx, name);
    }

    const node = ctx.nodes && resolvePath(ctx.nodes, ctx.cwd, whole);
    if (!node) return out([m.notFound(name, whole)], { error: true });
    if (node.type === 'folder') return out([m.isFolder(name, whole)], { error: true });
    const kind = fileKind(node.name);
    if (kind === 'other') return out([m.noProgram(name, whole)], { error: true });
    return out([m.starting(node.name)], { ops: [{ op: 'open', id: node.id, name: node.name }] });
};

// Fake but stable PIDs: 1000 + position among the open windows.
const taskList = (windows = []) =>
    windows.filter((w) => !w.isClosing).map((w, i) => ({ pid: 1000 + i, id: w.id, title: w.title, isMinimized: !!w.isMinimized }));

export const tasklistCommand = (ctx) => {
    const m = MSG[ctx.lang] || MSG.en;
    const tasks = taskList(ctx.windows);
    if (!tasks.length) return out([m.noTasks]);
    return out([
        m.taskHeader,
        ...tasks.map((t) => `${String(t.pid).padStart(5)}  ${String(t.title).slice(0, 24).padEnd(24)}  ${t.isMinimized ? m.minimized : m.running}`)
    ]);
};

export const killCommand = (name, args, ctx) => {
    const m = MSG[ctx.lang] || MSG.en;
    if (!args.length) return out([m.usageKill(name)], { error: true });
    const query = args.join(' ');
    const wanted = normalizeProgramName(query);
    const task = taskList(ctx.windows).find(
        (t) => String(t.pid) === query || t.id === wanted || normalizeProgramName(t.title) === wanted
    );
    if (!task) return out([m.noTask(name, query)], { error: true });
    return out([m.killed(task.title, task.pid)], { closeIds: [task.id] });
};
