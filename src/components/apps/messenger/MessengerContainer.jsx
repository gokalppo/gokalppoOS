import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import ChatInterface from './ChatInterface';
import BotChat from './BotChat';
import './Messenger.css';

const MessengerContainer = () => {
    const [user, setUser] = useState(null);
    const [botOnly, setBotOnly] = useState(false);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        setUser(null);
    };

    return (
        <div className="messenger-container">
            {!user && botOnly && <BotChat onBack={() => setBotOnly(false)} />}
            {!user && !botOnly && <LoginScreen onLogin={handleLogin} onBot={() => setBotOnly(true)} />}
            {user && (
                <ChatInterface user={user} onLogout={handleLogout} />
            )}
        </div>
    );
};

export default MessengerContainer;
