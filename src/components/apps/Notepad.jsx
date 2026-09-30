import React, { useState, useEffect, useRef } from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import FileExplorer from './FileExplorer';
import './Notepad.css';

const Notepad = ({ initialFileId }) => {
    const { getNode, createFile, updateFileContent } = useFileSystem();
    const [text, setText] = useState('');
    const [currentFileId, setCurrentFileId] = useState(initialFileId || null);
    const [showFileMenu, setShowFileMenu] = useState(false);
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
    const [saveAsName, setSaveAsName] = useState('Untitled.txt');
    const fileMenuRef = useRef(null);

    // Load the initial file's content once, if this Notepad was opened from a file.
    useEffect(() => {
        if (initialFileId) {
            const node = getNode(initialFileId);
            if (node) setText(node.content || '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (fileMenuRef.current && !fileMenuRef.current.contains(event.target)) {
                setShowFileMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const currentFile = currentFileId ? getNode(currentFileId) : null;
    const currentFileName = currentFile ? currentFile.name : 'Untitled.txt';

    const handleNew = () => {
        setText('');
        setCurrentFileId(null);
        setShowFileMenu(false);
    };

    const handleOpen = () => {
        setShowOpenDialog(true);
        setShowFileMenu(false);
    };

    const handleFileSelected = (node) => {
        setText(node.content || '');
        setCurrentFileId(node.id);
        setShowOpenDialog(false);
    };

    const handleSave = () => {
        setShowFileMenu(false);
        if (currentFileId) {
            updateFileContent(currentFileId, text);
        } else {
            setSaveAsName('Untitled.txt');
            setShowSaveAsDialog(true);
        }
    };

    const handleSaveAs = () => {
        setSaveAsName(currentFileName);
        setShowSaveAsDialog(true);
        setShowFileMenu(false);
    };

    const confirmSaveAs = () => {
        const name = saveAsName.trim() || 'Untitled.txt';
        const finalName = name.toLowerCase().endsWith('.txt') ? name : `${name}.txt`;
        const id = createFile('documents', finalName, text);
        setCurrentFileId(id);
        setShowSaveAsDialog(false);
    };

    const handleDownload = () => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setShowFileMenu(false);
    };

    return (
        <div className="notepad-container">
            <div className="notepad-menubar">
                <div
                    ref={fileMenuRef}
                    className="notepad-menu-item"
                    onClick={() => setShowFileMenu(!showFileMenu)}
                >
                    File
                    {showFileMenu && (
                        <div className="notepad-dropdown">
                            <div className="notepad-dropdown-item" onClick={handleNew}>New</div>
                            <div className="notepad-dropdown-item" onClick={handleOpen}>Open...</div>
                            <div className="notepad-dropdown-item" onClick={handleSave}>Save</div>
                            <div className="notepad-dropdown-item" onClick={handleSaveAs}>Save As...</div>
                            <div className="notepad-dropdown-item" onClick={handleDownload}>Download as .txt</div>
                        </div>
                    )}
                </div>
                <div className="notepad-menu-item">Edit</div>
                <div className="notepad-menu-item">Search</div>
                <div className="notepad-menu-item">Help</div>
                <div className="notepad-filename">{currentFileName}{currentFileId ? '' : ' (unsaved)'}</div>
            </div>
            <textarea
                className="notepad-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck="false"
            />

            {showOpenDialog && (
                <div className="notepad-modal-overlay" onClick={() => setShowOpenDialog(false)}>
                    <div className="notepad-open-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="notepad-dialog-header">
                            <span>Open</span>
                            <button className="notepad-dialog-close" onClick={() => setShowOpenDialog(false)}>X</button>
                        </div>
                        <div className="notepad-dialog-body">
                            <FileExplorer
                                rootId="root"
                                onOpenFile={(node) => {
                                    if (node.name.toLowerCase().endsWith('.txt')) handleFileSelected(node);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showSaveAsDialog && (
                <div className="notepad-modal-overlay" onClick={() => setShowSaveAsDialog(false)}>
                    <div className="notepad-saveas-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="notepad-dialog-header">
                            <span>Save As</span>
                        </div>
                        <div className="notepad-saveas-body">
                            <label>File name:</label>
                            <input
                                autoFocus
                                className="notepad-saveas-input"
                                value={saveAsName}
                                onChange={(e) => setSaveAsName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && confirmSaveAs()}
                            />
                            <div className="notepad-saveas-actions">
                                <button onClick={confirmSaveAs}>Save</button>
                                <button onClick={() => setShowSaveAsDialog(false)}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Notepad;
