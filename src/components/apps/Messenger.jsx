import React, { useState, useEffect, useRef } from 'react';
import './Messenger.css';

const Messenger = () => {
    const [contacts, setContacts] = useState([
        { id: 1, name: 'System Bot', status: 'online', avatar: '🤖' },
        { id: 2, name: '90s Lover', status: 'online', avatar: '💾' },
        { id: 3, name: 'HackerMan', status: 'busy', avatar: '🕶️' },
        { id: 4, name: 'Mom', status: 'offline', avatar: '👩' },
    ]);
    const [activeContactId, setActiveContactId] = useState(1);
    const [messages, setMessages] = useState({
        1: [
            { sender: 'them', text: 'Welcome to Retro Messenger!', timestamp: new Date().toLocaleTimeString() }
        ],
        2: [],
        3: [],
        4: []
    });
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const activeContact = contacts.find(c => c.id === activeContactId);

    const playDing = () => {
        // Simple retro beep using Web Audio API
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); // Drop to A4

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.error("Audio error:", e);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeContactId]);

    const handleSend = () => {
        if (!inputValue.trim()) return;

        const newMessage = {
            sender: 'me',
            text: inputValue,
            timestamp: new Date().toLocaleTimeString()
        };

        setMessages(prev => ({
            ...prev,
            [activeContactId]: [...(prev[activeContactId] || []), newMessage]
        }));

        setInputValue('');
        playDing();

        // Simulate reply
        setTimeout(() => {
            const replyResponses = [
                "That's totally radical!",
                "ASL?",
                "brb mom needs phone",
                "Have you seen the new Matrix movie?",
                "lol",
                "I'm downloading a song on Napster, getting 3kb/s!",
                "Windows 98 is the best OS ever."
            ];

            const randomReply = replyResponses[Math.floor(Math.random() * replyResponses.length)];

            const replyMessage = {
                sender: 'them',
                text: activeContactId === 1 ? `You said: "${inputValue}". I am a bot.` : randomReply,
                timestamp: new Date().toLocaleTimeString()
            };

            setMessages(prev => ({
                ...prev,
                [activeContactId]: [...(prev[activeContactId] || []), replyMessage]
            }));
            playDing();
        }, 1500);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="messenger-container">
            <div className="messenger-sidebar">
                <div className="messenger-header-small">Contacts</div>
                <div className="contact-list">
                    {contacts.map(contact => (
                        <div
                            key={contact.id}
                            className={`contact-item ${activeContactId === contact.id ? 'active' : ''}`}
                            onClick={() => setActiveContactId(contact.id)}
                        >
                            <div className={`status-icon ${contact.status}`}></div>
                            <span className="contact-avatar">{contact.avatar}</span>
                            <span className="contact-name">{contact.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="messenger-main">
                <div className="messenger-header-main">
                    {activeContact ? `Chatting with ${activeContact.name}` : 'Select a contact'}
                </div>

                <div className="message-history">
                    {messages[activeContactId]?.map((msg, index) => (
                        <div key={index} className={`message-line ${msg.sender}`}>
                            <span className="message-meta">
                                {msg.sender === 'me' ? 'You' : activeContact.name} ({msg.timestamp}):
                            </span>
                            <span className="message-text"> {msg.text}</span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="input-area">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                    />
                    <button onClick={handleSend}>Send</button>
                </div>
            </div>
        </div>
    );
};

export default Messenger;
