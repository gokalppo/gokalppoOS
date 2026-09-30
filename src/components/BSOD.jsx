import React, { useEffect, useState, useRef } from 'react';
import './BSOD.css';

// The Konami Code — a universally recognized "cheat code" sequence, chosen
// specifically because real OS-level combos like Ctrl+Alt+Del are
// intercepted by the operating system before JS ever sees them.
const KONAMI = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a'
];

const BSOD = () => {
    const [active, setActive] = useState(false);
    const progressRef = useRef(0);
    const armedRef = useRef(false); // guards against the same keypress both completing the code and instantly dismissing it

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            const expected = KONAMI[progressRef.current];

            if (key === expected) {
                progressRef.current += 1;
                if (progressRef.current === KONAMI.length) {
                    progressRef.current = 0;
                    setActive(true);
                }
            } else {
                progressRef.current = key === KONAMI[0] ? 1 : 0;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Arm dismissal on a short delay after showing, so the keyup of the
    // final Konami keypress can't instantly close it.
    useEffect(() => {
        if (!active) {
            armedRef.current = false;
            return;
        }
        const armTimer = setTimeout(() => { armedRef.current = true; }, 400);

        const dismiss = () => { if (armedRef.current) setActive(false); };
        window.addEventListener('keydown', dismiss);
        window.addEventListener('mousedown', dismiss);

        return () => {
            clearTimeout(armTimer);
            window.removeEventListener('keydown', dismiss);
            window.removeEventListener('mousedown', dismiss);
        };
    }, [active]);

    if (!active) return null;

    return (
        <div className="bsod-overlay">
            <div className="bsod-text">
                <pre>{`GokalpOS`}</pre>
                <br />
                An unrecoverable error has occurred at 0028:C000E36 in module GOKALPPO.EXE.
                The current application will be terminated.
                {'\n\n'}
                *  Press any key to terminate the current application.
                {'\n'}
                *  Press CTRL+ALT+DEL again to restart your computer. You will
                {'\n'}
                &nbsp;&nbsp;&nbsp;lose any unsaved information in all applications.
                {'\n\n'}
                Press any key to continue <span className="bsod-cursor">_</span>
            </div>
        </div>
    );
};

export default BSOD;
