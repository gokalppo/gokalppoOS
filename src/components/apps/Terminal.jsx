import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';
import { executeLine, promptFor, COMMAND_NAMES } from './terminalCommands';
import { completeInput } from './shellComplete';
import { pushHistory, stepHistory } from './terminalHistory';
import { sudoPrompt, sudoReply, describeBrowser, formatUptime, HOSTNAME, USER_NAME, OS_VERSION } from './shellSystem';
import { THEMES, DEFAULT_THEME, isTheme } from './terminalThemes';
import { getPrograms } from './programRegistry';
import { getWindows } from '../windowRegistry';
import { openApp, openFile, closeApp } from '../appBus';
import { useFileSystem } from '../../context/FileSystemContext';
import { useLanguage } from '../../context/LanguageContext';
import { subscribeTerminal } from './terminalBus';

const NEOFETCH_ASCII = `
       .---. 
      /     \\ 
      |  ()  |
      \\     / 
       '---'  
      /  |  \\ 
     /   |   \\ 
    /    |    \\ 
   '--'  |  '--'
      |  |  |   
      '--'--'
`;

const Bomb = () => {
    throw new Error('Illegal operation: user typed the forbidden command.');
};

const MatrixRain = ({ active }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!active) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = canvas.offsetWidth;
        let height = canvas.height = canvas.offsetHeight;

        const cols = Math.floor(width / 20);
        const ypos = Array(cols).fill(0);

        const matrix = () => {
            ctx.fillStyle = '#0001'; // Fade effect
            ctx.fillRect(0, 0, width, height);

            ctx.fillStyle = '#0f0';
            ctx.font = '15pt monospace';

            ypos.forEach((y, i) => {
                const text = String.fromCharCode(Math.random() * 128);
                const x = i * 20;
                ctx.fillText(text, x, y);

                if (y > 100 + Math.random() * 10000) ypos[i] = 0;
                else ypos[i] = y + 20;
            });
        };

        const interval = setInterval(matrix, 50);
        return () => clearInterval(interval);
    }, [active]);

    if (!active) return null;
    return <canvas ref={canvasRef} className="matrix-canvas" />;
};

const HeartAnim = () => {
    const [lines, setLines] = useState([]);
    const fullText = [
        "      ******       ******      ",
        "    **********   **********    ",
        "  ************* *************  ",
        " ***************************** ",
        " ***************************** ",
        "  ***************************  ",
        "    ***********************    ",
        "      *******************      ",
        "        ***************        ",
        "          ***********          ",
        "            *******            ",
        "              ***              ",
        "               *               ",
        "",
        "      Canım Sevgilim ❤️    "
    ];

    useEffect(() => {
        let currentLine = 0;
        const interval = setInterval(() => {
            if (currentLine < fullText.length) {
                setLines(prev => [...prev, fullText[currentLine]]);
                currentLine++;
            } else {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ color: '#ff1493', fontWeight: 'bold', margin: '10px 0', lineHeight: '14px' }}>
            {lines.map((line, i) => (
                <div key={i} style={{ whiteSpace: 'pre' }}>{line}</div>
            ))}
        </div>
    );
};

const TRAIN = [
    '      ====        ________                ___________ ',
    '  _D _|  |_______/        \\__I_I_____===__|_________| ',
    '   |(_)---  |   H\\________/ |   |        =|___ ___| ',
    '   /     |  |   H  |  |     |   |         ||_| |_|| ',
    '  |      |  |   H  |__--------------------| [___] |  ',
    '  | ________|___H__/__|_____/[][]~\\_______|       |  ',
    '  |/ |   |-----------I_____I [][] []  D   |=======|__',
    '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__',
    ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ',
    '  \\_/      \\_O=====O=====O=====O/      \\_/            '
].join('\n');

// A steam locomotive that chugs across the window (the `sl` command).
const Train = () => (
    <div className="terminal-train-track" aria-hidden="true">
        <pre className="terminal-train">{TRAIN}</pre>
    </div>
);

const THEME_KEY = 'gokalppoOS_terminalTheme';
const HISTORY_KEY = 'gokalppoOS_terminalHistory';

const loadTheme = () => {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        return isTheme(saved) ? saved : DEFAULT_THEME;
    } catch {
        return DEFAULT_THEME;
    }
};

const loadHistory = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
        return Array.isArray(saved) ? saved.filter((c) => typeof c === 'string') : [];
    } catch {
        return [];
    }
};

const SESSION_START = typeof performance !== 'undefined' ? performance.timeOrigin : Date.now();
const uptimeMs = () => Date.now() - SESSION_START;

// Lines may be { live } objects (a progress bar that rewrites itself) as well as plain text.
const lineText = (item) => (item && typeof item === 'object' && 'live' in item ? item.live : item);

const Terminal = () => {
    const { lang } = useLanguage();
    const fs = useFileSystem();
    const { nodes } = fs;
    const [cwdId, setCwdId] = useState('root');
    const cwd = nodes[cwdId] ? cwdId : 'root';
    const prompt = promptFor(nodes, cwd);
    const [theme, setTheme] = useState(loadTheme);

    // The screen. historyRef mirrors the state so timers (streaming output) always append to the latest lines.
    const initialScreen = [
        "gokalppoOS Kernel v1.0.4 loaded...",
        lang === 'tr' ? "Komutlar için 'help' yazın." : "Type 'help' for available commands."
    ];
    const [history, setHistory] = useState(initialScreen);
    const historyRef = useRef(initialScreen);
    const liveIndexRef = useRef(-1);
    const commit = (next) => {
        historyRef.current = next;
        setHistory(next);
    };
    const print = (...lines) => commit([...historyRef.current, ...lines]);

    const [input, setInput] = useState('');
    // Up/Down recall: cmdHistory is what was typed before, histIndex === length means "the line being typed".
    const [cmdHistory, setCmdHistory] = useState(loadHistory);
    const [histIndex, setHistIndex] = useState(() => cmdHistory.length);
    const draftRef = useRef('');
    const [matrixMode, setMatrixMode] = useState(false);

    // Slow output (ping, hack ...) plays from a queue; busy hides the prompt until it is done.
    const queueRef = useRef([]);
    const timerRef = useRef(null);
    const [busy, setBusy] = useState(false);
    // After `sudo`, the next lines typed are password attempts.
    const [secret, setSecret] = useState(null);

    const historyEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [history, busy]);

    useEffect(() => {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(cmdHistory));
        } catch {
            // history just will not survive a reload
        }
    }, [cmdHistory]);

    useEffect(() => {
        try {
            localStorage.setItem(THEME_KEY, theme);
        } catch {
            // the theme just will not survive a reload
        }
    }, [theme]);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const focusInput = () => inputRef.current?.focus();

    // --- streaming ---------------------------------------------------------
    const pump = () => {
        const queue = queueRef.current;
        if (!queue.length) {
            timerRef.current = null;
            liveIndexRef.current = -1;
            setBusy(false);
            return;
        }
        const item = queue.shift();
        if (item.live !== undefined) {
            const at = liveIndexRef.current;
            if (at >= 0 && at < historyRef.current.length) {
                const next = [...historyRef.current];
                next[at] = item.live;
                commit(next);
            } else {
                liveIndexRef.current = historyRef.current.length;
                print(item.live);
            }
        } else {
            liveIndexRef.current = -1;
            print(item.text);
        }
        timerRef.current = setTimeout(pump, item.delay);
    };

    const stream = (lines, delay) => {
        queueRef.current.push(...lines.map((l) => (
            l && typeof l === 'object' && 'live' in l ? { live: l.live, delay } : { text: l, delay }
        )));
        if (!timerRef.current) {
            setBusy(true);
            pump();
        }
    };

    const cancelStream = () => {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        queueRef.current = [];
        liveIndexRef.current = -1;
        setBusy(false);
    };

    // --- neofetch ----------------------------------------------------------
    const renderNeofetch = () => {
        const { browser, os } = describeBrowser(navigator.userAgent);
        const fileCount = Object.values(nodes).filter((n) => n.type === 'file').length;
        const rows = [
            ['User', `${USER_NAME}@${HOSTNAME}`],
            ['OS', `GokalpOS v${OS_VERSION} (Retro Edition)`],
            ['Host', `${browser} on ${os}`],
            ['Kernel', 'React 19 / Vite 7'],
            ['Uptime', formatUptime(uptimeMs(), lang).replace(/^[^:]+:\s*/, '')],
            ['Shell', 'g-sh 3.0'],
            ['Resolution', `${window.innerWidth}x${window.innerHeight}`],
            ['Windows', String(getWindows().filter((w) => !w.isClosing).length)],
            ['Files', String(fileCount)],
            ['Theme', theme],
            ['Education', 'Computer Engineering, 3rd Year']
        ];
        return (
            <div className="neofetch-container">
                <div className="neofetch-ascii">{NEOFETCH_ASCII}</div>
                <div className="neofetch-info">
                    {rows.map(([key, value]) => (
                        <div className="neofetch-row" key={key}>
                            <span className="neofetch-key">{key}:</span> <span className="neofetch-val">{value}</span>
                        </div>
                    ))}
                    <div className="neofetch-colors">
                        {['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'].map((c) => (
                            <div className="color-block" key={c} style={{ background: c }}></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // --- running commands --------------------------------------------------
    // Carries out the file-system changes a command asked for.
    const applyOps = (ops = []) => {
        ops.forEach((op) => {
            switch (op.op) {
                case 'mkdir': fs.createFolder(op.parentId, op.name, op.id); break;
                case 'create':
                    fs.createFile(op.parentId, op.name, op.content || '', op.id);
                    if (op.open) openFile({ id: op.id, name: op.name });
                    break;
                case 'write': fs.updateFileContent(op.id, op.content); break;
                case 'recycle': fs.moveToRecycle(op.id); break;
                case 'move': fs.moveNode(op.id, op.parentId); break;
                case 'rename': fs.renameNode(op.id, op.name); break;
                case 'open': openFile({ id: op.id, name: op.name }); break;
                default: break;
            }
        });
    };

    // Carries out one command's result; returns the lines to print (or null to wipe the screen).
    const showResult = (result) => {
        switch (result.type) {
            case 'clear': return null;
            case 'empty': return [];
            case 'open':
                window.open(result.url, '_blank', 'noopener,noreferrer');
                return result.lines;
            case 'matrix':
                setMatrixMode((prev) => !prev);
                return [!matrixMode
                    ? (lang === 'tr' ? "Matrix'e giriliyor..." : "Entering the Matrix...")
                    : (lang === 'tr' ? "Matrix kapatıldı." : "Matrix disabled.")];
            case 'neofetch': return [renderNeofetch()];
            case 'heart': return [<HeartAnim />];
            case 'crash': return [<Bomb />];
            case 'train': return [<Train />];
            case 'sudo':
                setSecret({ attempts: 0 });
                return [];
            default:
                applyOps(result.ops);
                if (result.cwd) setCwdId(result.cwd);
                if (result.theme) setTheme(result.theme);
                if (result.appId) openApp(result.appId);
                (result.closeIds || []).forEach(closeApp);
                return result.lines;
        }
    };

    const handleCommand = (cmd) => {
        const nextHistory = pushHistory(cmdHistory, cmd);
        setCmdHistory(nextHistory);
        setHistIndex(nextHistory.length);
        draftRef.current = '';

        const results = executeLine(cmd, new Date(), lang, {
            programs: getPrograms(),
            windows: getWindows(),
            nodes,
            cwd,
            canStore: fs.canStore,
            history: nextHistory,
            theme,
            uptimeMs: uptimeMs()
        });

        // Instant output is printed now; streamed output (ping, hack ...) is queued behind it.
        let screen = [...historyRef.current, `${prompt} ${cmd}`];
        const queued = [];
        for (const result of results) {
            const lines = showResult(result);
            if (lines === null) {
                screen = [];
            } else if (result.stream) {
                queued.push({ lines, delay: result.stream.delay });
            } else if (queued.length) {
                queued.push({ lines, delay: 0 });
            } else {
                screen = [...screen, ...lines];
            }
            if (result.type === 'sudo') break;
        }
        liveIndexRef.current = -1;
        commit(screen);
        queued.forEach(({ lines, delay }) => stream(lines, delay));
    };

    const submitSecret = () => {
        const attempt = secret.attempts + 1;
        const reply = sudoReply(attempt, lang);
        print(sudoPrompt(lang), ...reply.lines);
        setSecret(reply.done ? null : { attempts: attempt });
    };

    const clearScreen = () => commit([]);

    const resetRecall = () => {
        setHistIndex(cmdHistory.length);
        draftRef.current = '';
    };

    const handleTab = () => {
        const { input: completed, options } = completeInput(input, {
            commands: COMMAND_NAMES,
            nodes,
            cwd,
            programs: getPrograms(),
            windows: getWindows()
        });
        if (completed !== input) {
            setInput(completed);
        } else if (options.length > 1) {
            print(`${prompt} ${input}`, options.join('   '));
        }
    };

    // Commands handed over by the OS (Start > Run...).
    const runRef = useRef(handleCommand);
    useEffect(() => { runRef.current = handleCommand; });
    useEffect(() => subscribeTerminal((command) => runRef.current(command)), []);

    const handleKeyDown = (e) => {
        const key = e.key.toLowerCase();
        if (e.ctrlKey && !e.metaKey && !e.altKey && key === 'c' && (busy || secret || e.target.selectionStart === e.target.selectionEnd)) {
            e.preventDefault();
            cancelStream();
            print(`${secret ? sudoPrompt(lang) : prompt} ${secret ? '' : input}^C`);
            setSecret(null);
            setInput('');
            resetRecall();
            setMatrixMode(false);
            return;
        }
        if (busy) {
            if (e.key === 'Tab') e.preventDefault();
            return;
        }
        if (e.key === 'Enter') {
            if (secret) submitSecret();
            else handleCommand(input);
            setInput('');
        } else if (secret) {
            // no history or completion while typing a password
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const step = stepHistory({
                list: cmdHistory,
                index: histIndex,
                direction: e.key === 'ArrowUp' ? 'up' : 'down',
                draft: draftRef.current,
                current: input
            });
            draftRef.current = step.draft;
            setHistIndex(step.index);
            setInput(step.input);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            handleTab();
        } else if (e.ctrlKey && !e.metaKey && !e.altKey) {
            if (key === 'l') {
                e.preventDefault();
                clearScreen();
            } else if (key === 'u') {
                e.preventDefault();
                setInput('');
            }
        }
    };

    const themeColors = THEMES[theme] || THEMES[DEFAULT_THEME];

    return (
        <div
            className="terminal-container"
            onClick={focusInput}
            style={{ '--term-fg': themeColors.fg, '--term-dim': themeColors.dim }}
        >
            <MatrixRain active={matrixMode} />

            <div className="terminal-history">
                {history.map((line, i) => (
                    <div key={i} className="terminal-line">{lineText(line)}</div>
                ))}

                <div className={`terminal-input-line${busy ? ' busy' : ''}`}>
                    <span className="terminal-prompt">{secret ? sudoPrompt(lang) : prompt}</span>
                    <input
                        ref={inputRef}
                        type={secret ? 'password' : 'text'}
                        className="terminal-input"
                        value={input}
                        onChange={(e) => { setInput(e.target.value); resetRecall(); }}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        autoComplete="off"
                        spellCheck="false"
                        aria-label={secret ? sudoPrompt(lang) : 'Terminal'}
                    />
                    <span className="terminal-cursor">_</span>
                </div>
                <div ref={historyEndRef} />
            </div>
        </div>
    );
};

export default Terminal;
