import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../context/OSContext';
import { db } from '../../firebase';
import { ref, push, set } from "firebase/database";
import emailjs from '@emailjs/browser';
import './OutlookExpress.css';

// EMAILJS CONFIGURATION PLACEHOLDERS
const EMAILJS_SERVICE_ID = "service_n8kizne";
const EMAILJS_TEMPLATE_ID = "template_mqtgmml";
const EMAILJS_PUBLIC_KEY = "zlkywMd_ypg12lhN0";

const OutlookExpress = () => {
    const { volume, closeWindow } = useOS();
    const [from, setFrom] = useState(''); // Now editable
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    // Internal State
    const [isSending, setIsSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Message sent successfully.');

    // Removed initial effect that overwrites 'from' from token, 
    // or we can keep it as an initial value but allow editing.
    // Let's keep it as pre-fill.
    useEffect(() => {
        try {
            const token = localStorage.getItem('msn_token');
            if (token && token.includes('.')) {
                const payloadPart = token.split('.')[1];
                if (payloadPart) {
                    const payload = JSON.parse(atob(payloadPart));
                    if (payload && payload.email) {
                        setFrom(payload.email);
                    }
                }
            }
        } catch (e) {
            console.error("OE: Failed to read user info", e);
        }
    }, []);

    // Play "Chord" sound on open
    useEffect(() => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const playNote = (freq, time) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(volume * 0.2, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + time);
                    osc.start();
                    osc.stop(ctx.currentTime + time);
                };

                // Play C Major Chord (C5, E5, G5)
                playNote(523.25, 0.6);
                playNote(659.25, 0.6);
                playNote(783.99, 0.6);
            }
        } catch (e) {
            console.error("Audio error", e);
        }
    }, [volume]);

    // Play "Sent" sound
    const playSentSound = () => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                // Whoosh-like sound
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(400, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);

                gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

                osc.start();
                osc.stop(ctx.currentTime + 0.3);
            }
        } catch (e) { }
    };

    const handleSend = async () => {
        if (!body.trim()) {
            alert("Please enter a message before sending.");
            return;
        }
        if (!from.trim()) {
            alert("Please enter a sender email address.");
            return;
        }

        setIsSending(true);
        setSendProgress(10);
        setStatusMessage('Message sent successfully.'); // Default success

        // Timer to simulate steps if EmailJS is fast
        const timer = setInterval(() => {
            setSendProgress(prev => Math.min(prev + 5, 90));
        }, 100);

        try {
            // 1. Try EmailJS
            if (EMAILJS_SERVICE_ID !== "YOUR_SERVICE_ID") {
                await emailjs.send(
                    EMAILJS_SERVICE_ID,
                    EMAILJS_TEMPLATE_ID,
                    {
                        from_name: from,
                        to_name: "Gokalppo Admin",
                        message: body,
                        reply_to: from,
                        subject: subject
                    },
                    EMAILJS_PUBLIC_KEY
                );
            } else {
                // Determine logic if not configured: Throw error to trigger fallback? 
                // Or just proceed to DB? Let's treat unconfigured as "Network Error" to trigger fallback path.
                throw new Error("EmailJS Not Configured");
            }

            // Success Path
            clearInterval(timer);
            setSendProgress(100);

            // Also save to DB for record keeping even if sent
            await push(ref(db, 'outbox'), {
                from: from,
                to: 'gokalppoos@gmail.com',
                subject: subject,
                body: body,
                sentVia: 'emailjs',
                timestamp: Date.now()
            });

            setTimeout(() => {
                setIsSending(false);
                setIsSuccess(true);
                playSentSound();
            }, 500);

        } catch (error) {
            console.warn("EmailJS Failed, falling back to Firebase:", error);

            // 2. Fallback to Firebase
            try {
                await push(ref(db, 'outbox'), {
                    from: from,
                    to: 'gokalppoos@gmail.com',
                    subject: subject,
                    body: body,
                    sentVia: 'firebase_fallback',
                    timestamp: Date.now()
                });

                clearInterval(timer);
                setSendProgress(100);

                // Show "Saved to Outbox" warning in success modal
                setStatusMessage('Saved to outbox (Email service unavailable).');

                setTimeout(() => {
                    setIsSending(false);
                    setIsSuccess(true);
                    playSentSound();
                }, 500);

            } catch (dbError) {
                clearInterval(timer);
                setIsSending(false);
                alert("Critical Error: Could not send or save message.");
            }
        }
    };

    const handleSuccessClose = () => {
        setIsSuccess(false);
        closeWindow('newmessage');
    };

    return (
        <div className="outlook-express">
            {/* Toolbar */}
            <div className="oe-toolbar">
                <button className="oe-tool-btn" onClick={handleSend} disabled={isSending}>
                    <span className="oe-icon">✉️</span>
                    <span>Send</span>
                </button>
                <div className="oe-vline"></div>
                <button className="oe-tool-btn" title="Cut">
                    <span className="oe-icon">✂️</span>
                </button>
                <button className="oe-tool-btn" title="Copy">
                    <span className="oe-icon">📄</span>
                </button>
                <button className="oe-tool-btn" title="Paste">
                    <span className="oe-icon">📋</span>
                </button>
                <div className="oe-vline"></div>
                <button className="oe-tool-btn" title="Undo">
                    <span className="oe-icon">↩️</span>
                </button>
                <button className="oe-tool-btn" title="Check Names">
                    <span className="oe-icon">✔️</span>
                </button>
                <button className="oe-tool-btn" title="Select Recipients">
                    <span className="oe-icon">📖</span>
                </button>
            </div>

            {/* Header Fields - Reordered */}
            <div className="oe-headers">

                {/* TO */}
                <div className="oe-row">
                    <button className="oe-label-btn">To:</button>
                    <div className="oe-input-container">
                        <input
                            type="text"
                            className="oe-input"
                            value="gokalppoos@gmail.com"
                            readOnly
                        />
                    </div>
                </div>

                {/* FROM  (Moved Here & Editable) */}
                <div className="oe-row">
                    <button className="oe-label-btn">From:</button>
                    <div className="oe-input-container">
                        <input
                            type="email"
                            className="oe-input"
                            value={from}
                            onChange={(e) => setFrom(e.target.value)}
                            placeholder="your_email@example.com"
                        />
                    </div>
                </div>

                {/* SUBJECT */}
                <div className="oe-row">
                    <button className="oe-label-btn">Subject:</button>
                    <div className="oe-input-container">
                        <input
                            type="text"
                            className="oe-input"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="oe-body">
                <textarea
                    className="oe-textarea"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Type your message here..."
                    autoFocus
                />
            </div>

            {/* SENDING MODAL */}
            {isSending && (
                <div className="oe-modal-overlay">
                    <div className="oe-modal">
                        <div className="oe-modal-header">
                            <span>Sending Message</span>
                            <button className="oe-modal-close">X</button>
                        </div>
                        <div className="oe-modal-body">
                            <div style={{ marginBottom: '10px' }}>Sending message to gokalppoos@gmail.com...</div>
                            <div className="oe-progress-track">
                                <div
                                    className="oe-progress-bar"
                                    style={{ width: `${sendProgress}%` }}
                                ></div>
                            </div>
                            <div style={{ marginTop: '15px', textAlign: 'center' }}>
                                <button className="oe-standard-btn" disabled>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS MODAL */}
            {isSuccess && (
                <div className="oe-modal-overlay">
                    <div className="oe-modal" style={{ width: '350px' }}>
                        <div className="oe-modal-header">
                            <span>Outlook Express</span>
                            <button className="oe-modal-close" onClick={handleSuccessClose}>X</button>
                        </div>
                        <div className="oe-modal-body" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '24px' }}>ℹ️</div>
                            <div>{statusMessage}</div>
                        </div>
                        <div className="oe-modal-footer" style={{ textAlign: 'center', paddingBottom: '10px' }}>
                            <button className="oe-standard-btn" onClick={handleSuccessClose}>OK</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OutlookExpress;
