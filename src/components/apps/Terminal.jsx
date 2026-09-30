import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';

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

const Terminal = () => {
    const [history, setHistory] = useState([
        "gokalppoOS Kernel v1.0.4 loaded...",
        "Type 'help' for available commands."
    ]);
    const [input, setInput] = useState('');
    const [matrixMode, setMatrixMode] = useState(false);

    // Auto-scroll
    const historyEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [history]);

    // Keep focus
    const focusInput = () => {
        inputRef.current?.focus();
    };

    // Start time for uptime
    const [startTime] = useState(Date.now());

    const getUptime = () => {
        const now = Date.now();
        const diff = Math.floor((now - startTime) / 1000); // seconds
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        const s = diff % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const handleCommand = (cmd) => {
        const command = cmd.trim().toLowerCase();
        let output = [];

        // SUDO CHECK
        if (command.startsWith('sudo')) {
            output = [
                `Nice try, but you don't have root privileges!`
            ];
            setHistory(prev => [...prev, `C:\\Users\\Guest> ${cmd}`, ...output]);
            return;
        }

        switch (command) {
            case 'ece':
                output = [<HeartAnim />];
                break;
            case 'help':
                output = [
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
                break;
            case 'about':
                output = [
                    "-----------------------------",
                    " GOKALPPO - RETRO OS CREATOR ",
                    "-----------------------------",
                    "A passionate developer bringing",
                    "nostalgia back to the web.",
                    "Type 'github' or 'linkedin' to",
                    "see the real thing."
                ];
                break;
            case 'github':
                window.open('https://github.com/gokalppo', '_blank', 'noopener,noreferrer');
                output = ["Opening https://github.com/gokalppo ..."];
                break;
            case 'linkedin':
                window.open('https://www.linkedin.com/in/gokalp-eker/', '_blank', 'noopener,noreferrer');
                output = ["Opening https://www.linkedin.com/in/gokalp-eker/ ..."];
                break;
            case 'resume':
            case 'cv':
                window.open('/resume.pdf', '_blank', 'noopener,noreferrer');
                output = ["Opening resume.pdf ..."];
                break;
            case 'contact':
                output = [
                    "-----------------------------",
                    " CONTACT",
                    "-----------------------------",
                    "Email:     ekergokalp@gmail.com",
                    "GitHub:    github.com/gokalppo",
                    "LinkedIn:  linkedin.com/in/gokalp-eker",
                    "Instagram: instagram.com/_gokalpeker"
                ];
                break;
            case 'projects':
                output = [
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
                    "   images at 99.97% accuracy, Gradio UI."
                ];
                break;
            case 'clear':
                setHistory([]);
                return;
            case 'date':
                output = [new Date().toLocaleString()];
                break;
            case 'ls':
                output = [
                    "Desktop/",
                    "  My Computer",
                    "  Recycle Bin",
                    "  Notepad.exe",
                    "  MusicPlayer.exe",
                    "  Minesweeper.exe",
                    "  Terminal.exe",
                    "  resume.pdf"
                ];
                break;
            case 'matrix':
                setMatrixMode(prev => !prev);
                output = [!matrixMode ? "Entering the Matrix..." : "Matrix disabled."];
                break;
            case 'neofetch':
                const ascii = `
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
                // Neofetch Component
                const NeofetchComp = (
                    <div className="neofetch-container">
                        <div className="neofetch-ascii">{ascii}</div>
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
                output = [NeofetchComp];
                break;
            case '':
                break;
            default:
                output = [`Command not found: ${command}`];
        }

        setHistory(prev => [...prev, `C:\\Users\\Guest> ${cmd}`, ...output]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommand(input);
            setInput('');
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
                    <span className="terminal-prompt">C:\Users\Guest&gt;</span>
                    <input
                        ref={inputRef}
                        type="text"
                        className="terminal-input"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
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
