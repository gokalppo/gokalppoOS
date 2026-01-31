import React, { useState } from 'react';
import './Messenger.css';
import messengerIcon from '../../../assets/images/msn.png';

import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../../../firebase";
import { ref, set, get } from "firebase/database";

const LoginScreen = ({ onLogin }) => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [remember, setRemember] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Initial Setup
    useState(() => {
        // Auto-fill Logic
        const savedEmail = localStorage.getItem('msn_remember_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRemember(true);
        }
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // LOGIN GUARD: Check status
            const userRef = ref(db, `users/${user.uid}`);
            const snapshot = await get(ref(db, `users/${user.uid}`));
            const userData = snapshot.val();

            if (userData && userData.isBanned) {
                await auth.signOut();
                throw new Error("You are banned from gokalppoOS.");
            }

            if (remember) {
                localStorage.setItem('msn_remember_email', email);
            } else {
                localStorage.removeItem('msn_remember_email');
            }

            // Map Firebase user to app structure
            onLogin({
                email: user.email,
                username: (userData && userData.username) || user.displayName || user.email.split('@')[0],
                uid: user.uid,
                role: (userData && userData.role) || 'user' // Pass role
            });
        } catch (error) {
            if (error.code === 'auth/invalid-credential') {
                setErrorMessage('Invalid email or password.');
            } else if (error.message.includes("banned")) {
                setErrorMessage(error.message); // Custom Ban Message
            } else {
                setErrorMessage("Login Failed: " + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setSuccessMessage('');

        if (!email || !password || !username) return;

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters.');
            return;
        }

        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, {
                displayName: username
            });

            // FIX: Save to Realtime Database as well for searching
            await set(ref(db, 'users/' + user.uid), {
                uid: user.uid,
                email: email,
                username: username, // Important for search
                status: 'online',
                avatar: 'default'
            });

            setSuccessMessage("Account created!");
            setTimeout(() => {
                setIsSignUp(false);
                setSuccessMessage('');
                setPassword(''); // clear password for safety
            }, 2000);
        } catch (error) {
            if (error.code === 'auth/weak-password') {
                setErrorMessage('Password is too weak.');
            } else if (error.code === 'auth/email-already-in-use') {
                setErrorMessage('Email already in use.');
            } else {
                setErrorMessage("Signup Failed: " + error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="messenger-login" style={{ height: 'auto', minHeight: '300px', overflowY: 'visible' }}>
            <div className="login-logo">
                <img src={messengerIcon} alt="" style={{ width: '48px', height: '48px' }} />
                <span>Messenger</span>
            </div>

            <form className="login-form" onSubmit={isSignUp ? handleSignup : handleLogin}>
                {isSignUp && (
                    <>
                        <label>Username:</label>
                        <input
                            type="text"
                            className="login-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Screen Name"
                            required
                        />
                    </>
                )}

                <label>Email Address:</label>
                <input
                    type="email"
                    className="login-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@hotmail.com"
                    autoFocus
                    required
                />

                <label>Password:</label>
                <input
                    type="password"
                    className="login-input"
                    value={password}
                    onChange={(e) => {
                        setPassword(e.target.value);
                        if (isSignUp && e.target.value.length < 6 && e.target.value.length > 0) {
                            // Optional: Realtime validation visual hint can go here, but focusing on submit validation for now.
                        }
                    }}
                    required
                />
                {isSignUp && password.length > 0 && password.length < 6 && (
                    <small style={{ color: 'red', fontSize: '10px', marginTop: '-5px', marginBottom: '5px' }}>
                        Min 6 characters
                    </small>
                )}

                {!isSignUp && (
                    <div className="login-checkbox-row">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                        />
                        <label>Remember my password</label>
                    </div>
                )}

                {/* Feedback Messages */}
                {errorMessage && (
                    <div style={{ color: 'red', fontSize: '12px', textAlign: 'center', marginBottom: '5px', fontFamily: '"MS Sans Serif", sans-serif' }}>
                        {errorMessage}
                    </div>
                )}
                {successMessage && (
                    <div style={{ color: 'green', fontSize: '12px', textAlign: 'center', marginBottom: '5px', fontWeight: 'bold' }}>
                        {successMessage}
                    </div>
                )}

                <button type="submit" className="login-btn" disabled={isLoading}>
                    {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                </button>
            </form>

            <div className="login-footer">
                {isSignUp ? (
                    <span>Already have an account? <span style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setIsSignUp(false); setErrorMessage(''); }}>Sign In</span></span>
                ) : (
                    <span>Don't have an account? <span style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setIsSignUp(true); setErrorMessage(''); }}>Sign Up</span></span>
                )}
            </div>
        </div>
    );
};

export default LoginScreen;
