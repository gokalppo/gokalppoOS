import { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../../firebase';
import { ref, push, onValue, query, orderByChild, limitToLast, serverTimestamp } from 'firebase/database';
import { useLanguage } from '../../context/LanguageContext';
import { nowMs } from './messenger/chatUtils';
import {
    NAME_MAX, MESSAGE_MAX, VISIBLE_ENTRIES,
    normalizeEntry, validateEntry, cooldownRemainingMs, entriesFromSnapshot
} from './guestbookUtils';
import './Guestbook.css';

const NAME_KEY = 'gokalppoOS_guestbookName';
const LAST_POST_KEY = 'gokalppoOS_guestbookLastPost';

const readStore = (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
};
const writeStore = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
};

const Guestbook = () => {
    const { t, lang } = useLanguage();
    const [entries, setEntries] = useState(null); // null = loading
    const [loadError, setLoadError] = useState(false);
    const [name, setName] = useState(() => readStore(NAME_KEY) || '');
    const [message, setMessage] = useState('');
    const [status, setStatus] = useState(null); // { type: 'error' | 'success', text }
    const [sending, setSending] = useState(false);
    const honeypotRef = useRef(null);

    useEffect(() => {
        const entriesQuery = query(ref(db, 'guestbook'), orderByChild('timestamp'), limitToLast(VISIBLE_ENTRIES));
        const unsubscribe = onValue(
            entriesQuery,
            (snap) => { setEntries(entriesFromSnapshot(snap.val())); setLoadError(false); },
            () => { setLoadError(true); setEntries([]); }
        );
        return () => unsubscribe();
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        if (sending) return;
        // Bots fill every field; humans never see this one.
        if (honeypotRef.current?.value) return;

        const errors = validateEntry({ name, message });
        if (errors.length > 0) {
            setStatus({ type: 'error', text: t(`gb.err.${errors[0]}`) });
            return;
        }

        const wait = cooldownRemainingMs(Number(readStore(LAST_POST_KEY)) || 0, nowMs());
        if (wait > 0) {
            setStatus({ type: 'error', text: t('gb.err.cooldown', { seconds: Math.ceil(wait / 1000) }) });
            return;
        }

        setSending(true);
        try {
            const clean = normalizeEntry({ name, message });
            await push(ref(db, 'guestbook'), { ...clean, timestamp: serverTimestamp() });
            writeStore(NAME_KEY, clean.name);
            writeStore(LAST_POST_KEY, String(nowMs()));
            setMessage('');
            setStatus({ type: 'success', text: t('gb.thanks') });
        } catch {
            setStatus({ type: 'error', text: t('gb.err.failed') });
        } finally {
            setSending(false);
        }
    };

    const formatDate = useMemo(() => {
        const fmt = new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' });
        return (ts) => (ts ? fmt.format(new Date(ts)) : '');
    }, [lang]);

    return (
        <div className="gb-root">
            <div className="gb-banner">📖 {t('gb.title')}</div>

            <form className="gb-form" onSubmit={submit}>
                <label className="gb-label" htmlFor="gb-name">{t('gb.name')}</label>
                <input
                    id="gb-name"
                    className="gb-input"
                    value={name}
                    maxLength={NAME_MAX}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="nickname"
                />
                <label className="gb-label" htmlFor="gb-message">{t('gb.message')}</label>
                <textarea
                    id="gb-message"
                    className="gb-textarea"
                    value={message}
                    maxLength={MESSAGE_MAX}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                />
                <input ref={honeypotRef} className="gb-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" />
                <div className="gb-actions">
                    <span className="gb-counter">{message.length}/{MESSAGE_MAX}</span>
                    <button className="gb-btn" type="submit" disabled={sending}>{t('gb.sign')}</button>
                </div>
                {status && <div className={`gb-status ${status.type}`} role="status">{status.text}</div>}
            </form>

            <div className="gb-list" aria-live="polite">
                {entries === null && <div className="gb-empty">{t('window.loading')}</div>}
                {loadError && <div className="gb-empty">{t('gb.loadError')}</div>}
                {entries && !loadError && entries.length === 0 && <div className="gb-empty">{t('gb.empty')}</div>}
                {entries && entries.map((entry) => (
                    <div key={entry.id} className="gb-entry">
                        <div className="gb-entry-head">
                            <strong>{entry.name}</strong>
                            <span className="gb-date">{formatDate(entry.timestamp)}</span>
                        </div>
                        <div className="gb-entry-text">{entry.message}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Guestbook;
