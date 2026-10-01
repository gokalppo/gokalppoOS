import React, { useState, useRef } from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import { useLanguage } from '../../context/LanguageContext';
import MenuBar from './MenuBar';
import { OpenDialog, SaveAsDialog } from './FileDialogs';
import { findAll, findNext, replaceRange, replaceAll, timeDateStamp } from './textSearch';
import { ensureExtension, fileKind } from './fileTypes';
import './Notepad.css';

const Notepad = ({ initialFileId }) => {
    const { t, lang } = useLanguage();
    const { getNode, createFile, updateFileContent, findFileByName, canStore } = useFileSystem();
    const taRef = useRef(null);
    const findInputRef = useRef(null);

    const [text, setText] = useState(() => (initialFileId && getNode(initialFileId)?.content) || '');
    const [currentFileId, setCurrentFileId] = useState(initialFileId || null);
    const [showOpen, setShowOpen] = useState(false);
    const [showSaveAs, setShowSaveAs] = useState(false);
    const [saveAsError, setSaveAsError] = useState(null);
    const [showAbout, setShowAbout] = useState(false);
    const [wordWrap, setWordWrap] = useState(true);
    const [status, setStatus] = useState('');

    // Find / Replace panel
    const [findMode, setFindMode] = useState(null); // null | 'find' | 'replace'
    const [findText, setFindText] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [matchCase, setMatchCase] = useState(false);

    const currentFile = currentFileId ? getNode(currentFileId) : null;
    const currentFileName = currentFile ? currentFile.name : t('np.untitled');
    const matches = findMode ? findAll(text, findText, { matchCase }) : [];

    // ---- selection helpers -------------------------------------------------
    const selection = () => {
        const ta = taRef.current;
        return { start: ta.selectionStart, end: ta.selectionEnd };
    };

    const insertAtSelection = (str) => {
        const ta = taRef.current;
        const { start, end } = selection();
        const next = text.slice(0, start) + str + text.slice(end);
        setText(next);
        const caret = start + str.length;
        requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(caret, caret); });
    };

    const selectedText = () => {
        const { start, end } = selection();
        return text.slice(start, end);
    };

    // ---- Edit menu ----------------------------------------------------------
    const handleUndo = () => {
        taRef.current.focus();
        if (document.execCommand) document.execCommand('undo');
    };

    const handleCopy = async () => {
        const chosen = selectedText();
        if (!chosen) return false;
        try { await navigator.clipboard.writeText(chosen); return true; } catch { return false; }
    };

    const handleCut = async () => {
        if (await handleCopy()) insertAtSelection('');
    };

    const handlePaste = async () => {
        try {
            insertAtSelection(await navigator.clipboard.readText());
        } catch {
            setStatus(t('np.pasteBlocked'));
        }
    };

    const handleSelectAll = () => { taRef.current.focus(); taRef.current.select(); };
    const handleTimeDate = () => insertAtSelection(timeDateStamp(new Date(), lang));

    // ---- Find / Replace -----------------------------------------------------
    const openFind = (mode) => {
        const chosen = taRef.current ? selectedText() : '';
        if (chosen && !chosen.includes('\n')) setFindText(chosen);
        setFindMode(mode);
        setStatus('');
        requestAnimationFrame(() => findInputRef.current?.focus());
    };

    const selectMatch = (match) => {
        const ta = taRef.current;
        ta.focus(); // makes the browser scroll the match into view
        ta.setSelectionRange(match.start, match.end);
        findInputRef.current?.focus();
    };

    const findNextMatch = (query = findText) => {
        if (!query) return null;
        const match = findNext(text, query, taRef.current.selectionEnd, { matchCase });
        if (!match) {
            setStatus(t('np.notFound', { query }));
            return null;
        }
        setStatus('');
        selectMatch(match);
        return match;
    };

    const handleFindNext = () => {
        if (findMode) findNextMatch();
        else openFind('find');
    };

    const handleReplace = () => {
        if (!findText) return;
        const { start, end } = selection();
        const current = findAll(text, findText, { matchCase }).find((m) => m.start === start && m.end === end);
        if (current) {
            const next = replaceRange(text, current, replaceText);
            setText(next);
            // continue after the replacement
            requestAnimationFrame(() => {
                const caret = current.start + replaceText.length;
                taRef.current.setSelectionRange(caret, caret);
                const following = findNext(next, findText, caret, { matchCase });
                if (following) selectMatch(following);
                else setStatus(t('np.notFound', { query: findText }));
            });
        } else {
            findNextMatch();
        }
    };

    const handleReplaceAll = () => {
        if (!findText) return;
        const result = replaceAll(text, findText, replaceText, { matchCase });
        if (result.count === 0) {
            setStatus(t('np.notFound', { query: findText }));
            return;
        }
        setText(result.text);
        setStatus(t('np.replaced', { count: result.count }));
    };

    // ---- File menu ----------------------------------------------------------
    const handleNew = () => { setText(''); setCurrentFileId(null); setStatus(''); };

    const handleOpened = (node) => {
        setText(node.content || '');
        setCurrentFileId(node.id);
        setShowOpen(false);
        setStatus('');
    };

    const writeFile = (name) => {
        const finalName = ensureExtension(name, 'txt');
        if (!canStore(text.length)) return { error: t('np.diskFull') };
        const existing = findFileByName('documents', finalName);
        if (existing) {
            updateFileContent(existing.id, text);
            return { id: existing.id };
        }
        return { id: createFile('documents', finalName, text) };
    };

    const handleSave = () => {
        if (currentFileId) {
            if (!canStore(text.length)) { setStatus(t('np.diskFull')); return; }
            updateFileContent(currentFileId, text);
            setStatus(t('np.saved'));
        } else {
            setSaveAsError(null);
            setShowSaveAs(true);
        }
    };

    const handleSaveAs = () => { setSaveAsError(null); setShowSaveAs(true); };

    const confirmSaveAs = (name) => {
        const result = writeFile(name);
        if (result.error) { setSaveAsError(result.error); return; }
        setCurrentFileId(result.id);
        setShowSaveAs(false);
        setStatus(t('np.saved'));
    };

    const handleDownload = () => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ensureExtension(currentFileName, 'txt');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ---- keyboard shortcuts (only while focus is inside this Notepad) -------
    const handleKeyDown = (e) => {
        const mod = e.ctrlKey || e.metaKey;
        const key = e.key.toLowerCase();
        if (mod && key === 'f') { e.preventDefault(); openFind('find'); }
        else if (mod && key === 'h') { e.preventDefault(); openFind('replace'); }
        else if (mod && key === 's') { e.preventDefault(); handleSave(); }
        else if (e.key === 'F3') { e.preventDefault(); handleFindNext(); }
        else if (e.key === 'F5') { e.preventDefault(); handleTimeDate(); }
        else if (e.key === 'Escape' && findMode) { e.stopPropagation(); setFindMode(null); taRef.current?.focus(); }
    };

    const menus = [
        {
            id: 'file', label: t('np.menu.file'), items: [
                { label: t('np.new'), onSelect: handleNew },
                { label: t('np.open'), onSelect: () => setShowOpen(true) },
                { label: t('np.save'), shortcut: 'Ctrl+S', onSelect: handleSave },
                { label: t('np.saveAs'), onSelect: handleSaveAs },
                { separator: true },
                { label: t('np.download'), onSelect: handleDownload }
            ]
        },
        {
            id: 'edit', label: t('np.menu.edit'), items: [
                { label: t('np.undo'), shortcut: 'Ctrl+Z', onSelect: handleUndo },
                { separator: true },
                { label: t('np.cut'), shortcut: 'Ctrl+X', onSelect: handleCut },
                { label: t('np.copy'), shortcut: 'Ctrl+C', onSelect: handleCopy },
                { label: t('np.paste'), shortcut: 'Ctrl+V', onSelect: handlePaste },
                { separator: true },
                { label: t('np.selectAll'), shortcut: 'Ctrl+A', onSelect: handleSelectAll },
                { label: t('np.timeDate'), shortcut: 'F5', onSelect: handleTimeDate },
                { separator: true },
                { label: `${wordWrap ? '✓ ' : ''}${t('np.wordWrap')}`, onSelect: () => setWordWrap(!wordWrap) }
            ]
        },
        {
            id: 'search', label: t('np.menu.search'), items: [
                { label: t('np.find'), shortcut: 'Ctrl+F', onSelect: () => openFind('find') },
                { label: t('np.findNext'), shortcut: 'F3', onSelect: handleFindNext },
                { label: t('np.replace'), shortcut: 'Ctrl+H', onSelect: () => openFind('replace') }
            ]
        },
        {
            id: 'help', label: t('np.menu.help'), items: [
                { label: t('np.about'), onSelect: () => setShowAbout(true) }
            ]
        }
    ];

    return (
        <div className="notepad-container" onKeyDown={handleKeyDown}>
            <MenuBar menus={menus}>
                <div className="notepad-filename">{currentFileName}{currentFileId ? '' : t('np.unsaved')}</div>
            </MenuBar>

            {findMode && (
                <div className="np-find" role="dialog" aria-label={t('np.find')}>
                    <div className="np-find-row">
                        <label htmlFor="np-find-input">{t('np.findWhat')}</label>
                        <input
                            id="np-find-input"
                            ref={findInputRef}
                            value={findText}
                            onChange={(e) => { setFindText(e.target.value); setStatus(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFindNext(); } }}
                        />
                        <button className="np-btn" onClick={handleFindNext} disabled={!findText}>{t('np.btnFindNext')}</button>
                        <button className="np-btn" onClick={() => { setFindMode(null); taRef.current?.focus(); }}>{t('np.close')}</button>
                    </div>
                    {findMode === 'replace' && (
                        <div className="np-find-row">
                            <label htmlFor="np-replace-input">{t('np.replaceWith')}</label>
                            <input
                                id="np-replace-input"
                                value={replaceText}
                                onChange={(e) => setReplaceText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleReplace(); } }}
                            />
                            <button className="np-btn" onClick={handleReplace} disabled={!findText}>{t('np.btnReplace')}</button>
                            <button className="np-btn" onClick={handleReplaceAll} disabled={!findText}>{t('np.btnReplaceAll')}</button>
                        </div>
                    )}
                    <div className="np-find-row np-find-foot">
                        <label>
                            <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} />
                            {t('np.matchCase')}
                        </label>
                        <span className="np-find-count" role="status">
                            {findText ? (matches.length ? t('np.matches', { count: matches.length }) : t('np.noMatches')) : ''}
                        </span>
                    </div>
                </div>
            )}

            <textarea
                ref={taRef}
                className={`notepad-textarea ${wordWrap ? '' : 'nowrap'}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck="false"
                wrap={wordWrap ? 'soft' : 'off'}
                aria-label={currentFileName}
            />

            <div className="np-status" role="status">{status}</div>

            {showOpen && (
                <OpenDialog
                    title={t('np.openTitle')}
                    accept={(node) => fileKind(node.name) === 'text'}
                    onOpen={handleOpened}
                    onClose={() => setShowOpen(false)}
                />
            )}

            {showSaveAs && (
                <SaveAsDialog
                    title={t('np.saveAsTitle')}
                    initialName={currentFileId ? currentFileName : t('np.untitled')}
                    exists={(name) => Boolean(findFileByName('documents', ensureExtension(name, 'txt')))}
                    error={saveAsError}
                    onSave={confirmSaveAs}
                    onCancel={() => setShowSaveAs(false)}
                />
            )}

            {showAbout && (
                <div className="fd-overlay" onClick={() => setShowAbout(false)}>
                    <div className="fd-dialog fd-saveas" role="dialog" aria-modal="true" aria-label={t('np.about')} onClick={(e) => e.stopPropagation()}>
                        <div className="fd-header"><span>{t('np.about')}</span></div>
                        <div className="fd-saveas-body">
                            <div>{t('np.aboutText')}</div>
                            <div className="fd-actions">
                                <button className="fd-btn" autoFocus onClick={() => setShowAbout(false)}>OK</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notepad;
