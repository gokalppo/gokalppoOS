import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import FileExplorer from './FileExplorer';
import './FileDialogs.css';

// Win98-style "Open" dialog: browse the virtual disk and pick a file that `accept` allows.
export const OpenDialog = ({ title, accept, onOpen, onClose }) => {
    const { t } = useLanguage();
    return (
        <div className="fd-overlay" onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
            <div className="fd-dialog fd-open" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
                <div className="fd-header">
                    <span>{title}</span>
                    <button className="fd-close" onClick={onClose} aria-label={t('window.close')}>X</button>
                </div>
                <div className="fd-open-body">
                    <FileExplorer
                        rootId="root"
                        onOpenFile={(node) => { if (accept(node)) onOpen(node); }}
                    />
                </div>
            </div>
        </div>
    );
};

// "Save As": a file name, saved into My Documents. `exists(name)` lets it warn before replacing.
export const SaveAsDialog = ({ title, initialName, exists, error, onSave, onCancel }) => {
    const { t } = useLanguage();
    const [name, setName] = useState(initialName);
    const replacing = Boolean(name.trim()) && exists && exists(name);

    const submit = () => onSave(name);

    return (
        <div className="fd-overlay" onClick={onCancel}>
            <div
                className="fd-dialog fd-saveas"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
            >
                <div className="fd-header"><span>{title}</span></div>
                <div className="fd-saveas-body">
                    <label htmlFor="fd-name">{t('fd.fileName')}</label>
                    <input
                        id="fd-name"
                        autoFocus
                        className="fd-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                    />
                    <div className="fd-hint">{t('fd.savedIn')}</div>
                    {replacing && <div className="fd-warning" role="status">{t('fd.replaceWarning')}</div>}
                    {error && <div className="fd-error" role="alert">{error}</div>}
                    <div className="fd-actions">
                        <button className="fd-btn" onClick={submit}>{replacing ? t('fd.replace') : t('fd.save')}</button>
                        <button className="fd-btn" onClick={onCancel}>{t('fd.cancel')}</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
