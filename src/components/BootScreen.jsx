import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../context/OSContext';
import './BootScreen.css';

const bootLines = [
    "Award Modular BIOS v4.51PG, An Energy Star Ally",
    "Copyright (C) 1984-98, Award Software, Inc.",
    "PENTIUM-II CPU at 400MHz",
    "Memory Test : 65536K OK",
    "",
    "Award Plug and Play BIOS Extension v1.0A",
    "Copyright (C) 1998, Award Software, Inc.",
    "Detection HDD ... Primary Master : QUANTUM FIREBALL 6.4GB",
    "Detection HDD ... Primary Slave  : None",
    "Detection HDD ... Secondary Master : CD-ROM 32X",
    "Detection HDD ... Secondary Slave  : None",
    "",
    "Hardware: MMX2 Technology Detected",
    "Website Team: Ready",
    "",
    "Verifying DMI Pool Data ............",
    "Update Success",
    "",
    "Starting Windows 98..."
];

const BootScreen = ({ onComplete }) => {
    const { volume } = useOS(); // Use Audio Driver
    const [lines, setLines] = useState([]);
    const [showPrompt, setShowPrompt] = useState(false);

    // Audio context for beep
    const playBeep = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.type = 'square';
                osc.frequency.value = 800;
                gain.gain.value = volume * 0.1; // Apply global volume
                osc.start();
                setTimeout(() => osc.stop(), 100);
            }
        } catch (e) {
            console.error("Audio error", e);
        }
    };

    useEffect(() => {
        let currentIndex = 0;

        const interval = setInterval(() => {
            if (currentIndex < bootLines.length) {
                setLines(prev => [...prev, bootLines[currentIndex]]);
                currentIndex++;
            } else {
                clearInterval(interval);
                setShowPrompt(true);
            }
        }, 150); // Speed of scrolling text

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (showPrompt && e.key === 'Enter') {
                playBeep();
                onComplete();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showPrompt, onComplete]);

    return (
        <div className="boot-screen">
            <div className="boot-logo">
                <span className="energy-star">EPA POLLUTION PREVENTER</span>
                {/* Visual approximation of the Energy Star logo usually found in BIOS */}
            </div>
            <div className="boot-content">
                {lines.map((line, i) => (
                    <div key={i} className="boot-line">{line}</div>
                ))}
                {showPrompt && (
                    <div className="boot-prompt">
                        Press ENTER to start system<span className="cursor">_</span>
                    </div>
                )}
            </div>
            <div className="boot-footer">
                Press DEL to enter SETUP, ESC to skip memory test
            </div>
        </div>
    );
};

export default BootScreen;
