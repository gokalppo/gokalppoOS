import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './RunDialog.css';

// Win98 "Run" box: type a program, a web address or a Terminal command.
const RunDialog = ({ onExecute, onClose }) => {
    const { t } = useLanguage();
    const [value, setValue] = useState('');
    const inputRef = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const submit = (e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onExecute(value);
        onClose();
    };

    return (
        <div
            className="run-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={t('run.title')}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
        >
            <div className="run-title">
                <span>{t('run.title')}</span>
                <button type="button" className="run-x" onClick={onClose} aria-label={t('window.close')}>X</button>
            </div>
            <form className="run-body" onSubmit={submit}>
                <div className="run-text">
                    <span className="run-icon" aria-hidden="true">▶️</span>
                    <p>{t('run.prompt')}</p>
                </div>
                <div className="run-row">
                    <label htmlFor="run-input">{t('run.open')}</label>
                    <input
                        id="run-input"
                        ref={inputRef}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        spellCheck="false"
                        autoComplete="off"
                    />
                </div>
                <div className="run-buttons">
                    <button type="submit" className="run-btn" disabled={!value.trim()}>{t('run.ok')}</button>
                    <button type="button" className="run-btn" onClick={onClose}>{t('run.cancel')}</button>
                </div>
            </form>
        </div>
    );
};

export default RunDialog;
