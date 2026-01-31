import React, { useState, useEffect } from 'react';
import LoginScreen from './LoginScreen';
import ChatInterface from './ChatInterface';
import './Messenger.css';

const MessengerContainer = () => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        try {
            const token = localStorage.getItem('msn_token');
            if (token && token.includes('.')) {
                const payloadPart = token.split('.')[1];
                if (payloadPart) {
                    const payload = JSON.parse(atob(payloadPart));
                    setUser(payload);
                }
            }
        } catch (e) {
            console.error("Token parse error", e);
            localStorage.removeItem('msn_token');
        }
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('msn_token');
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
