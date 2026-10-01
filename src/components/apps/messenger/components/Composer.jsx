import { useState } from 'react';
import { EMOJIS } from '../chatUtils';

// Message input row. Owns the draft text; the parent decides what "send" means.
const Composer = ({ disabled, onSend, onNudge, onTyping, onStopTyping, showNudge = true }) => {
    const [input, setInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const submit = async () => {
        if (!input.trim()) return;
        const sent = await onSend(input);
        if (sent) setInput('');
    };

    const handleChange = (e) => {
        setInput(e.target.value);
        if (e.target.value) onTyping(); else onStopTyping();
    };

    const handleEmojiClick = (text) => {
        setInput((prev) => prev + text + ' ');
        setShowEmojiPicker(false);
    };

    return (
        <div className="msn-input-row">
            <div className="msn-toolbar" style={{ position: 'relative' }}>
                {showNudge && <button className="tool-btn" onClick={onNudge} title="Send Nudge">📳 Nudge</button>}
                <button className="tool-btn" title="Emoticons" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                    😊
                </button>

                {showEmojiPicker && (
                    <div className="emoji-picker-popup">
                        {EMOJIS.map((e) => (
                            <div key={e.text} className="emoji-item" onClick={() => handleEmojiClick(e.text)}>
                                {e.char}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', height: '100%' }}>
                <textarea
                    className="msn-textarea"
                    value={input}
                    onChange={handleChange}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submit())}
                    disabled={disabled}
                />
                <button
                    className="msn-send-btn login-btn"
                    onClick={submit}
                    style={{ height: '100%', marginTop: 0 }}
                    disabled={disabled}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default Composer;
