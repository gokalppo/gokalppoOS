import React, { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, increment, update } from 'firebase/database';
import './VisitorCounter.css';

const DIGITS = 6;

const VisitorCounter = () => {
    const [count, setCount] = useState(null);
    const hasIncremented = useRef(false);

    useEffect(() => {
        const counterRef = ref(db, 'siteStats/visitorCount');

        if (!hasIncremented.current) {
            hasIncremented.current = true;
            update(ref(db, 'siteStats'), { visitorCount: increment(1) }).catch((e) =>
                console.error('Visitor counter increment failed', e)
            );
        }

        const unsubscribe = onValue(counterRef, (snap) => {
            const value = snap.val() || 0;
            setCount(value);
            window.dispatchEvent(new CustomEvent('visitor-count', { detail: { count: value } }));
        });

        return () => unsubscribe();
    }, []);

    const display = count === null ? '...' : String(count).padStart(DIGITS, '0');

    return (
        <div className="visitor-counter" title="Site visitor count">
            <span className="visitor-counter-label">VISITORS</span>
            <div className="visitor-counter-digits">
                {display.split('').map((d, i) => (
                    <span key={i} className="visitor-counter-digit">{d}</span>
                ))}
            </div>
        </div>
    );
};

export default VisitorCounter;
