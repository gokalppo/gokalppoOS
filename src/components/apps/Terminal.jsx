import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';
import { executeLine, promptFor, COMMAND_NAMES } from './terminalCommands';
import { completeInput } from './shellComplete';
import { pushHistory, stepHistory } from './terminalHistory';
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

const HISTORY_KEY = 'gokalppoOS_terminalHistory';

const loadHistory = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
        return Array.isArray(saved) ? saved.filter((c) => typeof c === 'string') : [];
    } catch {
        return [];
    }
};

const Terminal = () => {
    const { lang } = useLanguage();
    const fs = useFileSystem();
    const { nodes } = fs;
    const [cwdId, setCwdId] = useState('root');
    const cwd = nodes[cwdId] ? cwdId : 'root';
    const prompt = promptFor(nodes, cwd);
    const [history, setHistory] = useState([
        "gokalppoOS Kernel v1.0.4 loaded...",
        lang === 'tr' ? "Komutlar için 'help' yazın." : "Type 'help' for available commands."
    ]);
    const [input, setInput] = useState('');
    // Up/Down recall: cmdHistory is what was typed before, histIndex === length means "the line being typed".
    const [cmdHistory, setCmdHistory] = useState(loadHistory);
    const [histIndex, setHistIndex] = useState(() => cmdHistory.length);
    const draftRef = useRef('');
    const [matrixMode, setMatrixMode] = useState(false);

    // Auto-scroll
    const historyEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [history]);

    useEffect(() => {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(cmdHistory));
        } catch {
            // history just will not survive a reload
        }
    }, [cmdHistory]);

    // Keep focus
    const focusInput = () => {
        inputRef.current?.focus();
    };

    // Start time for uptime
    const [startTime] = useState(() => Date.now());

    const getUptime = () => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000); // seconds
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const renderNeofetch = () => {
        const NeofetchComp = (
            <div className="neofetch-container">
                <div className="neofetch-ascii">{NEOFETCH_ASCII}</div>
                <div className="neofetch-info">
                    <div className="neofetch-row"><span className="neofetch-key">User:</span> <span className="neofetch-val">gokalppo</span></div>
                    <div className="neofetch-row"><span className="neofetch-key">OS:</span> <span className="neofetch-val">GokalpOS v1.0 (Retro Edition)</span></div>
                    <div className="neofetch-row"><span className="neofetch-key">Host:</span> <span className="neofetch-val">MacBook Pro (Intel Core i9/M Serisi)</span></div>
                    <div className="neofetch-row"><span className="neofetch-key">Kernel:</span> <span className="neofetch-val">React.js / Vite</span></div>
                    <div className="neofetch-row"><span className="neofetch-key">Uptime:</span> <span className="neofetch-val">{getUptime()}</span></div>
                    <div className="neofetch-row"><span className="neofetch-key">Shell:</span> <span className="neofetch-val">g-sh 2.0</span></div>
                    <div className="neofetch-row"><span className="neofetch-key">Resolution:</span> <span className="neofetch-val">{window.innerWidth}x{window.innerHeight}</span></div>
                    <div className="neofetch-row"><span className="neofetch-key">Education:</span> <span className="neofetch-val">Computer Engineering, 3rd Year</span></div>
                    <div className="neofetch-colors">
                        <div className="color-block" style={{ background: 'black' }}></div>
                        <div className="color-block" style={{ background: 'red' }}></div>
                        <div className="color-block" style={{ background: 'green' }}></div>
                        <div className="color-block" style={{ background: 'yellow' }}></div>
                        <div className="color-block" style={{ background: 'blue' }}></div>
                        <div className="color-block" style={{ background: 'magenta' }}></div>
                        <div className="color-block" style={{ background: 'cyan' }}></div>
                        <div className="color-block" style={{ background: 'white' }}></div>
                    </div>
                </div>
            </div>
        );
        return NeofetchComp;
    };

    // Carries out the file-system changes a command asked for.
    const applyOps = (ops = []) => {
        ops.forEach((op) => {
            switch (op.op) {
                case 'mkdir': fs.createFolder(op.parentId, op.name, op.id); break;
                case 'create': {
                    fs.createFile(op.parentId, op.name, op.content || '', op.id);
                    if (op.open) openFile({ id: op.id, name: op.name });
                    break;
                }
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
            default:
                applyOps(result.ops);
                if (result.cwd) setCwdId(result.cwd);
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
            history: nextHistory
        });

        let output = [];
        let cleared = false;
        results.forEach((result) => {
            const lines = showResult(result);
            if (lines === null) {
                output = [];
                cleared = true;
            } else {
                output = [...output, ...lines];
            }
        });

        setHistory((prev) => (cleared ? output : [...prev, `${prompt} ${cmd}`, ...output]));
    };

    const clearScreen = () => setHistory([]);

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
            setHistory((prev) => [...prev, `${prompt} ${input}`, options.join('   ')]);
        }
    };

    // Commands handed over by the OS (Start > Run...).
    const runRef = useRef(handleCommand);
    useEffect(() => { runRef.current = handleCommand; });
    useEffect(() => subscribeTerminal((command) => runRef.current(command)), []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommand(input);
            setInput('');
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
            const key = e.key.toLowerCase();
            const hasSelection = e.target.selectionStart !== e.target.selectionEnd;
            if (key === 'c' && !hasSelection) {
                e.preventDefault();
                setHistory((prev) => [...prev, `${prompt} ${input}^C`]);
                setInput('');
                resetRecall();
                setMatrixMode(false);
            } else if (key === 'l') {
                e.preventDefault();
                clearScreen();
            } else if (key === 'u') {
                e.preventDefault();
                setInput('');
            }
        }
    };

    return (
        <div className="terminal-container" onClick={focusInput}>
            <MatrixRain active={matrixMode} />

            <div className="terminal-history">
                {history.map((line, i) => (
                    <div key={i} className="terminal-line">{line}</div>
                ))}

                <div className="terminal-input-line">
                    <span className="terminal-prompt">{prompt}</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="terminal-input"
                        value={input}
                        onChange={(e) => { setInput(e.target.value); resetRecall(); }}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        spellCheck="false"
                    />
                    <span className="terminal-cursor">_</span>
                </div>
                <div ref={historyEndRef} />
            </div>
        </div>
    );
};

export default Terminal;
