import React, { useState, useEffect, useRef } from 'react';
import { useOS } from '../../../context/OSContext';
import ReactDOM from 'react-dom';
import './Messenger.css';
import { db } from "../../../firebase";
import { ref, push, onValue, off, get, set, remove, update, onDisconnect, increment, query, orderByChild, equalTo } from "firebase/database";
import starIcon from '../../../assets/images/star.png';

import nudgeSoundFile from '../../../assets/nudge.mp3';
import bannedSoundFile from '../../../assets/banned.mp3';
import MessageBox from '../../MessageBox';
import { auth } from "../../../firebase"; // Ensure auth is imported for signOut

const ChatInterface = ({ user, onLogout }) => {
    const { volume } = useOS(); // Use Audio Driver
    const [currentRoom, setCurrentRoom] = useState('global-1');
    const [status, setStatus] = useState('online');

    // Empty initial state - fetched from Firebase
    const [contacts, setContacts] = useState([]);
    const [activeContactId, setActiveContactId] = useState(null);

    const [messages, setMessages] = useState([]); // Changed to array for current room

    // SELF-HEALING: Check if I exist in DB with a username (Backfill)
    useEffect(() => {
        if (!user || !user.uid) return;
        const myRef = ref(db, `users/${user.uid}`);
        get(myRef).then((snap) => {
            const data = snap.val();
            if (!data || !data.username) {
                console.log("Backfilling missing username for:", user.email);
                const safeName = user.username || user.email.split('@')[0]; // Fallback
                update(myRef, {
                    uid: user.uid,
                    email: user.email,
                    username: safeName,
                    status: 'online'
                }).catch(err => console.error("Backfill failed", err));
            }
        });
    }, [user]);

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [musicTrack, setMusicTrack] = useState('');

    const [showAddContact, setShowAddContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Nudge Refs & State
    const containerRef = useRef(null);
    const nudgeCooldown = useRef(false);
    // Removed sessionStartTime as we are moving to State-Based logic
    const lastNudgeTime = useRef(0);
    const [nudgedContacts, setNudgedContacts] = useState({}); // { uid: true }

    // --- KILL SWITCH & BAN SYSTEM ---
    const [banTriggered, setBanTriggered] = useState(false);

    // Listen for OWN Ban Status
    useEffect(() => {
        if (!user || !user.uid) return;
        const myRef = ref(db, `users/${user.uid}/isBanned`);

        const unsub = onValue(myRef, (snap) => {
            if (snap.val() === true) {
                // SYSTEM ERROR TRIGGER
                setBanTriggered(true);

                // Play Audio
                const audio = new Audio(bannedSoundFile);
                audio.volume = volume;
                audio.play().catch(e => console.error(e));

                // Kill Session
                setTimeout(() => {
                    auth.signOut().catch(console.error);
                    if (onLogout) onLogout(); // Messenger Clean Exit
                }, 3000);
            }
        });

        return () => unsub();
    }, [user.uid]);

    // --- MESSAGE DELETION MODAL STATE ---
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [msgToDelete, setMsgToDelete] = useState(null);

    // ...

    const handleSearchUser = async () => {
        setSearchResult(null);
        setSearchError(null);
        if (!newContactName.trim()) return;

        const rawInput = newContactName.trim();
        const usersRef = ref(db, 'users');

        // Strategy: Try Exact String -> Number -> Lowercase
        const candidates = [];
        candidates.push(String(rawInput)); // Priority 1: Exact String

        if (!isNaN(rawInput)) {
            candidates.push(Number(rawInput)); // Priority 2: Number (for 444, etc)
        }

        if (rawInput.toLowerCase() !== rawInput) {
            candidates.push(rawInput.toLowerCase()); // Priority 3: Lowercase
        }

        // Remove duplicates to avoid redundant queries
        const uniqueCandidates = [...new Set(candidates)];

        console.log("--- SEARCH START ---");
        console.log(`Input: "${rawInput}"`);
        console.log("Candidates:", uniqueCandidates);

        let foundData = null;

        for (const val of uniqueCandidates) {
            console.log(`Querying orderByChild('username').equalTo(${typeof val === 'string' ? `"${val}"` : val})`);
            const q = query(usersRef, orderByChild('username'), equalTo(val));

            try {
                const snapshot = await get(q);
                const result = snapshot.val();
                console.log('Search Snapshot:', result); // Requested Log

                if (snapshot.exists()) {
                    foundData = result;
                    break; // Stop on first match
                }
            } catch (e) {
                console.error("Firebase Query Error:", e);
                setSearchError("DB Error: " + e.message);
                return;
            }
        }

        if (foundData) {
            // Assuming the first key is the user we want
            const uid = Object.keys(foundData)[0];
            const userData = foundData[uid];
            console.log("User Found:", userData);
            setSearchResult(userData);
        } else {
            console.warn("All search attempts failed.");
            setSearchError('User not found.');
        }
    };

    const sendFullFriendRequest = async (targetUser) => {
        // Validation Logic
        if (targetUser.uid === user.uid) {
            setSearchError("You cannot add yourself.");
            return;
        }

        if (contacts.find(c => c.uid === targetUser.uid)) {
            setSearchError("Already in your friends list.");
            return;
        }

        // Check Pending (Self check local or DB?)
        // Better to check DB, but for now checking 'sentRequests' triggers if we had it.
        // We will just try to write. The DB rules might block or we check before write.
        // Let's check DB for outgoing request or incoming.
        const reqPath = `friendRequests/${targetUser.uid}/${user.uid}`; // I am sending TO them
        const snap = await get(ref(db, reqPath));
        if (snap.exists()) {
            setSearchError("Request already pending.");
            return;
        }

        const newReq = {
            fromUid: user.uid,
            fromName: user.username,
            fromEmail: user.email,
            status: 'pending'
        };

        try {
            await set(ref(db, reqPath), newReq);
            setSearchResult(null);
            setSearchError(null);
            setShowAddContact(false);
            showNotification(`Request sent to ${targetUser.username}!`, "success");
        } catch (e) {
            setSearchError("Failed to send.");
        }
    };

    // Social Features
    const [friendRequests, setFriendRequests] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [notification, setNotification] = useState(null);

    const showNotification = (msg, type = 'info') => {
        const id = Date.now();
        setNotification({ msg, type, id });
        setTimeout(() => setNotification(null), 3000);
    };

    // 1. SOUND & FLASH ALERT SYSTEM
    const prevUnreadTotal = useRef(0);
    useEffect(() => {
        const total = contacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

        // Initial load shouldn't ding unless we want it to. 
        // Let's assume on mount total might be > 0. We might skip first run or accept it.
        // But to avoid "ding" on refresh, maybe check if ref is not 0?
        // Actually, let's just ding if it INCREASES.
        // Initialize ref with 0, so if we load with 5 unread, it dings. That's fine (Welcome back).

        if (total > prevUnreadTotal.current) {
            // Unread count increased -> MEANING: New background message
            playDing();
            window.dispatchEvent(new CustomEvent('flash-taskbar', { detail: { appId: 'messenger' } }));
        }
        prevUnreadTotal.current = total;
    }, [contacts]);

    // 2. AUTO-READ (Clear unread when chat is open)
    useEffect(() => {
        if (currentRoom === 'private' && activeContactId) {
            const contact = contacts.find(c => c.uid === activeContactId);
            if (contact && contact.unreadCount > 0) {
                // Clear DB logic
                update(ref(db, `users/${user.uid}/friends/${activeContactId}`), { unreadCount: 0 });
            }
        }
    }, [contacts, currentRoom, activeContactId, user.uid]);


    // Listen for Friend Requests
    useEffect(() => {
        const requestsRef = ref(db, `friendRequests/${user.uid}`);
        const unsubscribe = onValue(requestsRef, (snapshot) => {
            const data = snapshot.val();
            setFriendRequests(data ? Object.keys(data).map(key => ({ ...data[key], key })) : []);
        });
        return () => unsubscribe();
    }, [user.uid]);

    // LISTEN FOR FRIENDS (PERSISTENCE)
    useEffect(() => {
        const friendsRef = ref(db, `users/${user.uid}/friends`);
        const unsubscribe = onValue(friendsRef, (snapshot) => {
            const data = snapshot.val();
            setContacts(data ? Object.values(data) : []);
        });
        return () => unsubscribe();
    }, [user.uid]);

    // PRESENCE SYSTEM: SELF (Connection Monitoring)
    useEffect(() => {
        const connectedRef = ref(db, ".info/connected");
        const myStatusRef = ref(db, `users/${user.uid}/status`);

        const unsubscribe = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                // We're connected!
                onDisconnect(myStatusRef).set('offline');
                set(myStatusRef, 'online');
                setStatus('online');
            }
        });

        return () => {
            unsubscribe();
        };
    }, [user.uid]);

    // PRESENCE SYSTEM: FRIENDS (Live Status Monitoring)
    const [friendStatuses, setFriendStatuses] = useState({});

    useEffect(() => {
        if (contacts.length === 0) return;

        const unsubscribes = [];
        contacts.forEach(contact => {
            const statusRef = ref(db, `users/${contact.uid}/status`);
            const unsub = onValue(statusRef, (snap) => {
                const s = snap.val();
                setFriendStatuses(prev => ({ ...prev, [contact.uid]: s || 'offline' }));
            });
            unsubscribes.push(unsub);
        });

        return () => {
            unsubscribes.forEach(fn => fn());
        };
    }, [contacts]);

    // AUTO-AWAY SYSTEM
    const idleTimer = useRef(null);
    const statusRef = useRef(status); // Keep track of status for event listeners

    // Keep ref in sync
    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    useEffect(() => {
        const setAway = () => {
            if (statusRef.current === 'online') { // Only switch if Online (don't override Busy/Offline)
                handleStatusChange('away'); // This updates DB and State
                console.log("Auto-Away Triggered");
            }
        };

        const resetTimer = () => {
            if (statusRef.current === 'away') {
                handleStatusChange('online'); // Return to Available
                console.log("Auto-Away Reset: Welcome back!");
            }

            if (idleTimer.current) clearTimeout(idleTimer.current);
            idleTimer.current = setTimeout(setAway, 300000); // 5 Minutes
        };

        // Events to listen for
        const events = ['mousemove', 'keydown', 'mousedown', 'scroll', 'touchstart'];

        events.forEach(evt => window.addEventListener(evt, resetTimer));

        resetTimer(); // Start timer

        return () => {
            if (idleTimer.current) clearTimeout(idleTimer.current);
            events.forEach(evt => window.removeEventListener(evt, resetTimer));
        };
    }, []); // Run once on mount

    // GLOBAL NUDGE LISTENER
    useEffect(() => {
        if (!user || !user.uid) return;
        const nudgeRef = ref(db, `users/${user.uid}/latestNudge`);

        const unsubscribe = onValue(nudgeRef, (snapshot) => {
            const data = snapshot.val();

            // Check if we have a nudge and it hasn't been processed yet
            // We check receiverId to ensure it's for us, though path ensures it too.
            if (data && !data.isProcessed) {
                // 1. Shake & Sound
                triggerShake();

                // 2. UI Indicator
                if (data.senderUid !== activeContactId) {
                    setNudgedContacts(prev => ({ ...prev, [data.senderUid]: true }));
                    window.dispatchEvent(new CustomEvent('flash-taskbar', { detail: { appId: 'messenger', force: true } }));
                }

                // 3. Mark as Processed immediately (State-Based)
                // This prevents re-shake on reload
                update(nudgeRef, { isProcessed: true }).catch(e => console.error("Nudge ack failed", e));

                // Keep timestamp updated just in case
                lastNudgeTime.current = data.timestamp;
            }
        });
        return () => unsubscribe();
    }, [user, activeContactId]);

    // STATUS SYNC (Fan-Out)
    const handleStatusChange = (newStatus) => {
        setStatus(newStatus);
        update(ref(db, `users/${user.uid}`), { status: newStatus });
        contacts.forEach(friend => {
            update(ref(db, `users/${friend.uid}/friends/${user.uid}`), { status: newStatus });
        });
    };

    // Check Duplicate & Send Request
    const sendFriendRequest = async (targetUser) => {
        setContextMenu(null);
        if (!targetUser.senderUid || targetUser.sender === user.email) return;

        if (targetUser.senderUid === user.uid) {
            showNotification("You cannot add yourself!", "error");
            return;
        }

        // COOLDOWN CHECK
        const declineRef = ref(db, `declinedHistory/${targetUser.senderUid}/${user.uid}`);
        try {
            const decSnap = await get(declineRef);
            if (decSnap.exists()) {
                const ts = decSnap.val();
                const diff = Date.now() - ts;
                const COOLDOWN = 3600000; // 1 Hour
                if (diff < COOLDOWN) {
                    const mins = Math.ceil((COOLDOWN - diff) / 60000);
                    showNotification(`You can try again in ${mins} minutes.`, "warning");
                    return;
                }
            }
        } catch (e) { /* ignore */ }

        const reqPath = `friendRequests/${targetUser.senderUid}/${user.uid}`;
        const reqRef = ref(db, reqPath);

        try {
            const snapshot = await get(reqRef);
            if (snapshot.exists()) {
                showNotification("Request already sent!", "warning");
                return;
            }

            const newReq = {
                fromUid: user.uid,
                fromName: user.username,
                fromEmail: user.email,
                status: 'pending'
            };

            await set(reqRef, newReq);
            showNotification(`Request sent to ${targetUser.senderName}!`, "success");
        } catch (e) {
            showNotification("Error: " + e.message, "error");
        }
    };

    const handleAcceptRequest = async (req) => {
        try {
            await remove(ref(db, `friendRequests/${user.uid}/${req.fromUid}`));
        } catch (e) { console.error(e); }

        if (contacts.find(c => c.uid === req.fromUid)) {
            showNotification(`${req.fromName} is already your friend.`, "info");
            return;
        }

        const myFriendRef = ref(db, `users/${user.uid}/friends/${req.fromUid}`);
        const theirFriendRef = ref(db, `users/${req.fromUid}/friends/${user.uid}`);

        const newFriendData = {
            id: req.fromUid,
            uid: req.fromUid,
            name: req.fromName,
            status: 'online',
            avatar: 'star'
        };

        const meAsFriendData = {
            id: user.uid,
            uid: user.uid,
            name: user.username,
            status: status,
            avatar: 'star'
        };

        try {
            await set(myFriendRef, newFriendData);
            await set(theirFriendRef, meAsFriendData);

            showNotification(`Accepted ${req.fromName}!`, "success");
        } catch (e) {
            showNotification("Error accepting: " + e.message, "error");
        }
    };

    const handleDeclineRequest = async (req) => {
        try {
            await remove(ref(db, `friendRequests/${user.uid}/${req.fromUid}`));
            await set(ref(db, `declinedHistory/${user.uid}/${req.fromUid}`), Date.now());
            showNotification("Request declined.", "info");
        } catch (e) {
            showNotification("Error declining: " + e.message, "error");
        }
    };

    const handleUserContextMenu = (e, msgUser) => {
        e.preventDefault();
        const container = e.currentTarget.closest('.chat-interface');
        if (container) {
            const rect = container.getBoundingClientRect();
            setContextMenu({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                user: msgUser
            });
        }
    };

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const emojis = [
        { char: '😊', text: ':)' },
        { char: '😂', text: ':D' },
        { char: '😛', text: ':P' },
        { char: '😢', text: ':(' },
        { char: '😎', text: '8)' },
        { char: '😲', text: ':O' },
        { char: '❤️', text: '<3' },
        { char: '😡', text: '>:@' }
    ];

    const handleEmojiClick = (text) => {
        setInput(prev => prev + text + " ");
        setShowEmojiPicker(false);
    };

    const messagesEndRef = useRef(null);

    useEffect(() => {
        playDing();
    }, []);

    useEffect(() => {
        const handleMusicUpdate = (e) => {
            setMusicTrack(e.detail.track);
        };
        window.addEventListener('music-update', handleMusicUpdate);
        return () => window.removeEventListener('music-update', handleMusicUpdate);
    }, []);

    useEffect(() => {
        let messagesRef;
        setMessages([]);

        try {
            if (currentRoom === 'private' && activeContactId) {
                const contactId = activeContactId;
                const myId = user.uid;
                const roomId = [myId, contactId].sort().join('_');
                messagesRef = ref(db, `privateMessages/${roomId}`);
            } else if (currentRoom.startsWith('global')) {
                messagesRef = ref(db, `messages/${currentRoom}`);
            }

            if (messagesRef) {
                const unsubscribe = onValue(messagesRef, (snapshot) => {
                    const data = snapshot.val();
                    // Fix: Map to Include Keys for Deletion
                    const messagesArray = data ? Object.keys(data).map(key => ({ ...data[key], key })) : [];
                    messagesArray.sort((a, b) => a.timestamp - b.timestamp);

                    // Check for Nudge in new messages (Basic Logic: if last msg is nudge and recent)
                    // if (messagesArray.length > 0) {
                    //     const lastMsg = messagesArray[messagesArray.length - 1];
                    //     if (lastMsg.type === 'nudge' && lastMsg.timestamp > lastNudgeTime.current) {
                    //         triggerShake();
                    //         lastNudgeTime.current = lastMsg.timestamp;
                    //     }
                    // }
                    // ^^^ OLD LOGIC REPLACED BY GLOBAL LISTENER ^^^

                    setMessages(messagesArray);
                }, (error) => {
                    console.error("Firebase Read Error:", error);
                    setMessages([]);
                });
                return () => off(messagesRef);
            }
        } catch (err) {
            console.error("Firebase Sync Error:", err);
        }
    }, [currentRoom, activeContactId, user.uid]);

    const formatTime = (ts) => {
        if (!ts) return "";
        if (typeof ts === 'string') return ts;
        const date = new Date(ts);
        return date.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const playDing = () => {
        try {
            const audio = new Audio();
            audio.volume = volume * 0.3; // Reduce volume a bit for notification beeps
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(volume * 0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { }
    };

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(scrollToBottom, [messages, currentRoom, activeContactId]);

    const activeContact = contacts.find(c => c.uid === activeContactId);

    const handleSend = async () => {
        if (!input.trim()) return;

        // Auto-Mod
        const cleanText = input.replace(/(bad|evil|cursed)/gi, '***');

        const newMessage = {
            sender: user.email,
            senderName: user.username,
            senderUid: user.uid,
            text: cleanText,
            timestamp: Date.now()
        };

        try {
            let path = '';
            const updates = {};

            if (currentRoom === 'private' && activeContactId) {
                const roomId = [user.uid, activeContactId].sort().join('_');
                path = `privateMessages/${roomId}`;

                // Unread Count Logic: Increment for RECEIVER
                updates[`users/${activeContactId}/friends/${user.uid}/unreadCount`] = increment(1);
            } else {
                path = `messages/${currentRoom}`;
            }

            const newMsgKey = push(ref(db, path)).key;
            updates[`${path}/${newMsgKey}`] = newMessage;

            await update(ref(db), updates);

            setInput('');
            playDing();
        } catch (error) {
            console.error("Send Error:", error);
            showNotification("Failed to send: " + error.message, "error");
        }
    };

    const triggerShake = () => {
        console.log("--- NUDGE TRIGGERED ---");
        if (containerRef.current) {
            containerRef.current.classList.remove('shake-animation'); // Reset
            // Trigger reflow
            void containerRef.current.offsetWidth;
            containerRef.current.classList.add('shake-animation');

            // Remove class after animation
            setTimeout(() => {
                if (containerRef.current) containerRef.current.classList.remove('shake-animation');
            }, 500);
        }
        playNudgeSound();
    };

    const playNudgeSound = () => {
        try {
            const audio = new Audio(nudgeSoundFile);
            audio.volume = volume;
            audio.play().catch(e => {
                console.warn("Nudge sound failed (Autoplay/File missing?), playing Ding fallback", e);
                playDing();
            });
        } catch (e) { playDing(); }
    };

    const handleNudge = async () => {
        if (!currentRoom.startsWith('private') && !activeContact) {
            showNotification("Nudges are only available in private chat!", "warning");
            return;
        }

        if (nudgeCooldown.current) {
            showNotification("Wait a moment before nudging again!", "warning");
            return;
        }

        nudgeCooldown.current = true;
        setTimeout(() => nudgeCooldown.current = false, 5000); // 5s Cooldown

        // Local effect immediately
        // triggerShake(); // Actually, let the listener trigger it so it syncs? 
        // No, sender should feel it immediately.
        triggerShake();

        // Global Nudge Event for Receiver
        try {
            const globalNudgePath = `users/${activeContact.uid}/latestNudge`;
            await set(ref(db, globalNudgePath), {
                senderUid: user.uid,
                senderName: user.username,
                timestamp: Date.now(),
                isProcessed: false // Flag for new state-based logic
            });
        } catch (e) {
            console.error("Global nudge write failed", e);
        }

        const nudgeMsg = {
            type: 'nudge',
            sender: user.email,
            senderName: user.username,
            senderUid: user.uid,
            timestamp: Date.now()
        };

        try {
            let path = '';
            if (currentRoom === 'private' && activeContactId) {
                const roomId = [user.uid, activeContactId].sort().join('_');
                path = `privateMessages/${roomId}`;
            } else {
                path = `messages/${currentRoom}`;
            }
            await push(ref(db, path), nudgeMsg);
        } catch (error) {
            console.error("Nudge Error:", error);
        }
    };

    const handleBan = () => {
        if (user.role !== 'admin' || !activeContact) return;
        showNotification(`User ${activeContact.name} has been banned!`, "error");
    };

    const handleAddContact = () => {
        showNotification("Use Right Click -> Add Friend on chat messages!", "info");
        setShowAddContact(false);
    };

    const handleContactClick = (uid) => {
        setActiveContactId(uid);
        setCurrentRoom('private');
        setNudgedContacts(prev => {
            const next = { ...prev };
            delete next[uid];
            return next;
        });
        // Immediate Clear on click
        update(ref(db, `users/${user.uid}/friends/${uid}`), { unreadCount: 0 });
    };

    const handleRemoveContact = async (e, uid, name) => {
        e.stopPropagation();
        try {
            await remove(ref(db, `users/${user.uid}/friends/${uid}`));
            await remove(ref(db, `users/${uid}/friends/${user.uid}`));

            if (activeContactId === uid) {
                setActiveContactId(null);
                setCurrentRoom('global-1');
            }
            showNotification(`${name} unfriended (Mutual).`, "info");
        } catch (e) {
            showNotification("Error removing: " + e.message, "error");
        }
    };


    // --- ADMIN SYSTEM ---
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [allUsers, setAllUsers] = useState([]);

    const loadAllUsers = async () => {
        if (user.role !== 'admin') return;
        try {
            const snap = await get(ref(db, 'users'));
            if (snap.exists()) {
                setAllUsers(Object.values(snap.val()));
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        if (showAdminPanel) loadAllUsers();
    }, [showAdminPanel]);

    const handleBanUser = async (targetUid, currentBanStatus) => {
        if (user.role !== 'admin') return;
        try {
            await update(ref(db, `users/${targetUid}`), { isBanned: !currentBanStatus });
            showNotification(`User ${!currentBanStatus ? 'BANNED' : 'UNBANNED'}`, "success");
            loadAllUsers(); // Refresh
        } catch (e) { showNotification("Ban error: " + e.message, "error"); }
    };

    const handleDeleteMessage = (msg) => {
        if (user.role !== 'admin') return;
        setMsgToDelete(msg);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteMessage = async () => {
        if (!msgToDelete) return;

        try {
            let path = '';
            if (currentRoom === 'private' && activeContactId) {
                const roomId = [user.uid, activeContactId].sort().join('_');
                path = `privateMessages/${roomId}/${msgToDelete.key}`;
            } else {
                path = `messages/${currentRoom}/${msgToDelete.key}`;
            }

            // Soft delete with visual placeholder
            await update(ref(db, path), {
                text: "This message was removed by admin",
                isDeleted: true
            });
            setShowDeleteConfirm(false);
            setMsgToDelete(null);
        } catch (e) { showNotification("Delete error: " + e.message, "error"); }
    };

    return (
        <div className="chat-interface" ref={containerRef}>
            <div className="msn-sidebar">
                <div className="user-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>{user.username || user.email.split('@')[0]}</strong>
                        <button className="tool-btn" onClick={async () => {
                            try {
                                await set(ref(db, `users/${user.uid}/status`), 'offline');
                            } catch (e) { console.error("Logout status error", e); }
                            onLogout();
                        }} title="Sign Out" style={{ fontSize: '10px', color: 'red' }}>[X]</button>
                    </div>
                    {user.role === 'admin' && (
                        <button
                            className="tool-btn"
                            style={{ width: '100%', marginTop: '5px', background: 'darkred', color: 'white', fontWeight: 'bold' }}
                            onClick={() => setShowAdminPanel(true)}
                        >
                            🚫 Admin Tools
                        </button>
                    )}
                    <select
                        className="user-status-select"
                        value={status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                    >
                        <option value="online">(Available)</option>
                        <option value="busy">(Busy)</option>
                        <option value="away">(Away)</option>
                        <option value="offline">(Appear Offline)</option>
                    </select>
                    {musicTrack && (
                        <div className="music-status" title={musicTrack}>
                            🎵 {musicTrack}
                        </div>
                    )}
                </div>

                <div className="msn-contact-list">
                    {contacts.map(c => (
                        <div
                            key={c.uid}
                            className={`msn-contact ${currentRoom === 'private' && activeContactId === c.uid ? 'active' : ''}`}
                            onClick={() => handleContactClick(c.uid)}
                        >
                            <div className="contact-item-container" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                {/* 1. Status Dot */}
                                <div className={`status-dot ${friendStatuses[c.uid] || c.status || 'offline'}`}></div>

                                {/* Name and Star Container */}
                                <span style={{ display: 'flex', alignItems: 'center', marginLeft: '6px' }}>
                                    <img
                                        src={starIcon}
                                        alt="Friend"
                                        style={{ width: '12px', height: '12px', marginRight: '5px' }}
                                    />
                                    {c.name}
                                    {nudgedContacts[c.uid] && (
                                        <span style={{ color: 'red', fontWeight: 'bold', marginLeft: '4px', animation: 'blink 1s infinite' }}>!!</span>
                                    )}
                                </span>

                                {/* Unread Badge */}
                                {c.unreadCount > 0 && (
                                    <div className="unread-badge">({c.unreadCount})</div>
                                )}
                            </div>

                            <button
                                className="tool-btn"
                                style={{ fontSize: '10px', padding: '0 2px', lineHeight: '10px' }}
                                onClick={(e) => handleRemoveContact(e, c.uid, c.name)}
                                title="Unfriend"
                            >
                                x
                            </button>
                        </div>
                    ))}
                </div>

                {!showAddContact ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <button className="login-btn" style={{ fontSize: '10px' }} onClick={() => { setShowAddContact(true); setSearchError(null); }}>
                            + Add Contact
                        </button>
                        {friendRequests.length > 0 && (
                            <div className="friend-requests">
                                <small style={{ color: 'navy', fontWeight: 'bold' }}>Requests ({friendRequests.length}):</small>
                                {friendRequests.map((req, i) => (
                                    <div key={i} className="request-item" style={{ background: '#ffffe0', border: '1px solid orange', padding: '2px', fontSize: '9px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{req.fromName}</span>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <button onClick={() => handleAcceptRequest(req)} title="Accept" style={{ color: 'green', cursor: 'pointer' }}>✔</button>
                                            <button onClick={() => handleDeclineRequest(req)} title="Decline" style={{ color: 'red', cursor: 'pointer' }}>X</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                        margin: '5px',
                        boxSizing: 'border-box',
                        border: '2px solid #fff',
                        borderColor: '#fff #808080 #808080 #fff',
                        background: '#c0c0c0',
                        padding: '6px',
                        flexShrink: 0, /* Prevent shrinking */
                        alignItems: 'stretch'
                    }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'black' }}>Find Friend:</div>
                        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', width: '100%' }}>
                            <input
                                style={{
                                    flex: 1,
                                    minWidth: 0,
                                    fontSize: '11px',
                                    border: '2px inset #ffffff',
                                    backgroundColor: 'white',
                                    padding: '2px 4px',
                                    outline: 'none',
                                    height: '24px',
                                    color: 'black',
                                    fontFamily: 'gokalppoOS, sans-serif',
                                    boxSizing: 'border-box'
                                }}
                                value={newContactName}
                                onChange={(e) => setNewContactName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                                placeholder="Username..."
                            />
                            <button
                                className="login-btn"
                                onClick={handleSearchUser}
                                style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    width: '20px',
                                    flexShrink: 0,
                                    height: '24px',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: 0
                                }}
                            >
                                🔍
                            </button>
                        </div>

                        {/* Search Result (Success) */}
                        {searchResult && (
                            <div style={{
                                marginTop: '4px',
                                background: '#c0c0c0',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                padding: '2px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <img src={starIcon} style={{ width: '12px', opacity: 0.5 }} alt="" />
                                    <span style={{ fontWeight: 'bold' }}>User found: {searchResult.username}</span>
                                </div>
                                <button
                                    className="login-btn"
                                    style={{ width: '100%', marginTop: 0 }}
                                    onClick={() => sendFullFriendRequest(searchResult)}
                                >
                                    Send Request
                                </button>
                            </div>
                        )}

                        {/* Error Feedback (Retro Style) */}
                        {searchError && (
                            <div style={{
                                marginTop: '4px',
                                background: '#c0c0c0',
                                border: '1px solid black',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <div style={{
                                    width: '14px',
                                    height: '14px',
                                    background: 'red',
                                    color: 'white',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    border: '1px solid black',
                                    lineHeight: '14px'
                                }}>X</div>
                                <span style={{ fontSize: '10px', color: 'black' }}>{searchError}</span>
                            </div>
                        )}

                        <button
                            className="login-btn"
                            style={{ marginTop: '4px' }}
                            onClick={() => { setShowAddContact(false); setSearchResult(null); setSearchError(null); setNewContactName(''); }}
                        >
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            <div className="msn-chat-area">
                <div className="messenger-tabs">
                    <button className={`tab-btn ${currentRoom === 'global-1' ? 'active' : ''}`} onClick={() => { setCurrentRoom('global-1'); setActiveContactId(null); }}>Global-1</button>
                    <button className={`tab-btn ${currentRoom === 'global-2' ? 'active' : ''}`} onClick={() => { setCurrentRoom('global-2'); setActiveContactId(null); }}>Global-2</button>
                </div>

                <div className="chat-header">
                    <span>
                        {currentRoom === 'private' && activeContact
                            ? `Chatting with ${activeContact.name}`
                            : `Public Room: ${currentRoom.toUpperCase()}`}
                    </span>
                    <div className="chat-actions">
                        {/* Ban button removed from here. Admins must use Admin Panel. */}
                    </div>
                </div>

                <div className="chat-history">
                    {Array.isArray(messages) && messages.map((msg, i) => (
                        <div key={i} className="msg-entry">
                            {msg.type === 'nudge' ? (
                                <div className="nudge-alert">
                                    {msg.sender === user.email ? 'You sent a nudge!' : `${msg.senderName || 'User'} sent a nudge!`}
                                </div>
                            ) : (
                                <div className={`msg-line ${msg.sender === user.email ? 'me' : 'them'}`} onClick={() => { /* No Action */ }}>
                                    <div className="msg-meta" style={{ color: msg.sender === user.email ? 'purple' : 'navy' }}>
                                        <span
                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={(e) => { e.stopPropagation(); handleUserContextMenu(e, msg); }}
                                        >
                                            {msg.sender === user.email ? 'You' : (msg.senderName || 'User')}
                                        </span>

                                        {contacts.some(c => c.uid === msg.senderUid) && (
                                            <img src={starIcon} alt="Friend" style={{ width: '10px', height: '10px', margin: '0 4px', verticalAlign: 'middle' }} />
                                        )}

                                        ({formatTime(msg.timestamp)}):
                                    </div>
                                    <span className="msg-text">
                                        {msg.isDeleted ? (
                                            <span style={{ fontFamily: '"Courier New", monospace', color: 'gray', fontStyle: 'italic', fontSize: '10px', border: '1px dashed gray', padding: '1px 3px' }}>
                                                ⚠️ This message was removed by admin
                                            </span>
                                        ) : (
                                            <>
                                                {msg.text}
                                                {user.role === 'admin' && (
                                                    <span
                                                        className="admin-del-btn"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg); }}
                                                        title="Delete Message"
                                                        style={{ color: 'red', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold', fontSize: '10px' }}
                                                    >
                                                        [x]
                                                    </span>
                                                )}
                                            </>
                                        )}
                                        {!msg.isDeleted && msg.sender === user.email && msg.read && <span className="msg-tick-read">✓</span>}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                    {isTyping && activeContact && <div className="typing-indicator">{activeContact.name} is typing...</div>}
                    <div ref={messagesEndRef} />
                </div>

                {notification && (
                    <div className="msn-notification-bar" style={{
                        position: 'absolute', bottom: '40px', left: '10px', right: '10px',
                        background: '#ffffe0', border: '1px solid black', padding: '5px',
                        fontSize: '11px', color: notification.type === 'error' ? 'red' : 'black',
                        zIndex: 2000, boxShadow: '2px 2px 5px rgba(0,0,0,0.2)'
                    }}>
                        {notification.type === 'error' ? '⚠️ ' : 'ℹ️ '}
                        {notification.msg}
                    </div>
                )}

                {contextMenu && (
                    <div
                        className="msn-context-menu"
                        style={{
                            position: 'absolute',
                            top: contextMenu.y,
                            left: contextMenu.x,
                            background: 'white',
                            border: '1px solid gray',
                            boxShadow: '2px 2px 5px rgba(0,0,0,0.2)',
                            zIndex: 1000,
                            padding: '5px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <div style={{ fontWeight: 'bold', borderBottom: '1px solid #eee', marginBottom: '2px' }}>{contextMenu.user.senderName}</div>
                        {contacts.some(c => c.uid === contextMenu.user.senderUid) ? (
                            <div style={{ color: 'gray', fontStyle: 'italic', fontSize: '10px' }}>Already Friends</div>
                        ) : (
                            contextMenu.user.senderUid !== user.uid && (
                                <button
                                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                                    onClick={() => sendFriendRequest(contextMenu.user)}
                                >
                                    + Add as Friend
                                </button>
                            )
                        )}
                    </div>
                )}

                <div className="msn-input-row">
                    <div className="msn-toolbar" style={{ position: 'relative' }}>
                        <button className="tool-btn" onClick={handleNudge} title="Send Nudge">📳 Nudge</button>
                        <button
                            className="tool-btn"
                            title="Emoticons"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        >
                            😊
                        </button>

                        {showEmojiPicker && (
                            <div className="emoji-picker-popup">
                                {emojis.map((e, i) => (
                                    <div key={i} className="emoji-item" onClick={() => handleEmojiClick(e.text)}>
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
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                            disabled={currentRoom === 'private' && !activeContact}
                        />
                        <button
                            className="msn-send-btn login-btn"
                            onClick={handleSend}
                            style={{ height: '100%', marginTop: 0 }}
                            disabled={currentRoom === 'private' && !activeContact}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
            {/* ADMIN PANEL MODAL */}
            {
                showAdminPanel && (
                    <div style={{
                        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        width: '300px', height: '400px', background: '#c0c0c0', border: '2px outset white',
                        zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '5px', boxShadow: '5px 5px 10px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ background: 'darkblue', color: 'white', padding: '2px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Admin Tools</span>
                            <button onClick={() => setShowAdminPanel(false)} style={{ background: '#c0c0c0', border: '1px outset white', cursor: 'pointer' }}>X</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', background: 'white', border: '2px inset white', marginTop: '5px', padding: '5px' }}>
                            <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid black' }}>
                                        <th>User</th>
                                        <th>Role</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allUsers.map(u => (
                                        <tr key={u.uid} style={{ borderBottom: '1px solid #eee' }}>
                                            <td>{u.username} <br /><small style={{ color: 'gray' }}>{u.email}</small></td>
                                            <td>{u.role || 'user'}</td>
                                            <td>
                                                {u.uid !== user.uid && (
                                                    <button
                                                        onClick={() => handleBanUser(u.uid, u.isBanned)}
                                                        style={{
                                                            background: u.isBanned ? 'green' : 'red',
                                                            color: 'white', border: '1px outset white',
                                                            cursor: 'pointer', padding: '2px 5px'
                                                        }}
                                                    >
                                                        {u.isBanned ? 'UNBAN' : 'BAN'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
            {/* RETRO MESSAGE BOX */}
            {showDeleteConfirm && (
                <MessageBox
                    title="System Verification"
                    message="Are you sure you want to delete this message? This action is administrative."
                    type="warning"
                    buttons={['OK', 'Cancel']}
                    onResult={(res) => {
                        if (res === 'OK') confirmDeleteMessage();
                        else {
                            setShowDeleteConfirm(false);
                            setMsgToDelete(null);
                        }
                    }}
                />
            )}

            {/* KILL SWITCH OVERLAY */}
            {/* KILL SWITCH OVERLAY (PORTAL) */}
            {banTriggered && ReactDOM.createPortal(
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
                    background: '#0000AA', color: 'white', zIndex: 99999999, // Explicit high Z-Index
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Courier New", monospace', fontSize: '24px', fontWeight: 'bold'
                }}>
                    <div style={{ background: 'white', color: 'blue', padding: '10px 20px', marginBottom: '20px' }}>
                        SYSTEM ERROR: ACCESS_DENIED
                    </div>
                    <div>You have been banned by administrator.</div>
                    <div style={{ fontSize: '14px', marginTop: '20px' }}>Terminating session...</div>
                    <div style={{ fontSize: '72px', marginTop: '30px' }}>☹</div>
                </div>,
                document.body
            )}
        </div >
    );
};

export default ChatInterface;
