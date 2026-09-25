import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import ChatInterface from './ChatInterface';
import './Messenger.css';

const MessengerContainer = () => {
    const [user, setUser] = useState(null);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        setUser(null);
    };

    return (
        <div className="messenger-container">
            {!user ? (
                <LoginScreen onLogin={handleLogin} />
            ) : (
                <ChatInterface user={user} onLogout={handleLogout} />
            )}
        </div>
    );
};

export default MessengerContainer;
