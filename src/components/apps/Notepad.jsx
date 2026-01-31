import React, { useState } from 'react';
import './Notepad.css';

const Notepad = () => {
    const [text, setText] = useState('');
    const [showFileMenu, setShowFileMenu] = useState(false);

    const handleSave = () => {
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'note.txt';
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
                    className="notepad-menu-item"
                    onClick={() => setShowFileMenu(!showFileMenu)}
                >
                    File
                    {showFileMenu && (
                        <div className="notepad-dropdown">
                            <div className="notepad-dropdown-item" onClick={handleSave}>Save</div>
                            <div className="notepad-dropdown-item" onClick={() => setShowFileMenu(false)}>Exit</div>
                        </div>
                    )}
                </div>
                <div className="notepad-menu-item">Edit</div>
                <div className="notepad-menu-item">Search</div>
                <div className="notepad-menu-item">Help</div>
            </div>
            <textarea
                className="notepad-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck="false"
            />
        </div>
    );
};

export default Notepad;
