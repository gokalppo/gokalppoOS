import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOS } from '../../../context/OSContext';
import './Messenger.css';
import { db } from '../../../firebase';
import { ref, push, get, set, remove, update, increment } from 'firebase/database';
import MessageBox from '../../MessageBox';
import { censorText, getMessagesPath, nowMs } from './chatUtils';
import { useNotification } from './hooks/useNotification';
import { useSounds } from './hooks/useSounds';
import { useBanWatcher } from './hooks/useBanWatcher';
import { useFriendData } from './hooks/useFriendData';
import { usePresence } from './hooks/usePresence';
import { useMessages } from './hooks/useMessages';
import { useTypingIndicator } from './hooks/useTypingIndicator';
import { useNudge } from './hooks/useNudge';
import { useFriendActions } from './hooks/useFriendActions';
import { useAdminTools } from './hooks/useAdminTools';
import ContactSidebar from './components/ContactSidebar';
import ChatHeader from './components/ChatHeader';
import MessageList from './components/MessageList';
import Composer from './components/Composer';
import NotificationBar from './components/NotificationBar';
import UserContextMenu from './components/UserContextMenu';
import AdminPanel from './components/AdminPanel';
import BanOverlay from './components/BanOverlay';

const ChatInterface = ({ user, onLogout }) => {
    const { volume } = useOS();
    const containerRef = useRef(null);

    const [currentRoom, setCurrentRoom] = useState('global-1');
    const [activeContactId, setActiveContactId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null);

    const { notification, showNotification } = useNotification();
    const { playDing, playNudgeSound } = useSounds(volume);
    const banTriggered = useBanWatcher({ uid: user.uid, volume, onLogout });
    const { contacts, friendRequests } = useFriendData(user.uid);
    const { status, friendStatuses, handleStatusChange } = usePresence({ uid: user.uid, contacts });
    const messages = useMessages({ currentRoom, activeContactId, uid: user.uid });
    const activeContact = contacts.find((c) => c.uid === activeContactId);

    const { isTyping, notifyTyping, stopTyping } = useTypingIndicator({
        uid: user.uid, currentRoom, activeContactId
    });
    const { nudgedContacts, clearNudgeFor, handleNudge } = useNudge({
        user, containerRef, currentRoom, activeContactId, activeContact, showNotification, playNudgeSound
    });
    const { sendFriendRequest, acceptRequest, declineRequest } = useFriendActions({
        user, contacts, status, showNotification
    });
    const admin = useAdminTools({ user, currentRoom, activeContactId, showNotification });

    // Self-healing: make sure my public profile has a username, and keep my
    // email in the private (non-public) node.
    useEffect(() => {
        const myRef = ref(db, `users/${user.uid}`);
        get(myRef).then((snap) => {
            const data = snap.val();
            if (!data || !data.username) {
                update(myRef, {
                    uid: user.uid,
                    username: user.username || user.email.split('@')[0],
                    status: 'online'
                }).catch((err) => console.error('Backfill failed', err));
            }
        });
        update(ref(db, `userPrivate/${user.uid}`), { email: user.email }).catch(() => { });
    }, [user.uid, user.username, user.email]);

    useEffect(() => { playDing(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Ding + flash the taskbar when the total unread count goes up.
    const prevUnreadTotal = useRef(0);
    useEffect(() => {
        const total = contacts.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        if (total > prevUnreadTotal.current) {
            playDing();
            window.dispatchEvent(new CustomEvent('flash-taskbar', { detail: { appId: 'messenger' } }));
        }
        prevUnreadTotal.current = total;
    }, [contacts, playDing]);

    // Clear unread when the conversation is open.
    useEffect(() => {
        if (currentRoom === 'private' && activeContact && activeContact.unreadCount > 0) {
            update(ref(db, `users/${user.uid}/friends/${activeContactId}`), { unreadCount: 0 });
        }
    }, [activeContact, currentRoom, activeContactId, user.uid]);

    // Any click dismisses the message context menu.
    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, []);

    const handleSend = useCallback(async (rawText) => {
        const path = getMessagesPath(currentRoom, activeContactId, user.uid);
        if (!path) return false;

        try {
            const updates = {};
            if (currentRoom === 'private') {
                updates[`users/${activeContactId}/friends/${user.uid}/unreadCount`] = increment(1);
            }
            const newMsgKey = push(ref(db, path)).key;
            updates[`${path}/${newMsgKey}`] = {
                senderName: user.username,
                senderUid: user.uid,
                text: censorText(rawText),
                timestamp: nowMs()
            };
            await update(ref(db), updates);

            stopTyping();
            playDing();
            return true;
        } catch (error) {
            console.error('Send Error:', error);
            showNotification('Failed to send: ' + error.message, 'error');
            return false;
        }
    }, [currentRoom, activeContactId, user.uid, user.username, stopTyping, playDing, showNotification]);

    const handleSelectGlobalRoom = (room) => {
        setCurrentRoom(room);
        setActiveContactId(null);
    };

    const handleContactClick = (uid) => {
        setActiveContactId(uid);
        setCurrentRoom('private');
        clearNudgeFor(uid);
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
            showNotification(`${name} unfriended (Mutual).`, 'info');
        } catch (err) {
            showNotification('Error removing: ' + err.message, 'error');
        }
    };

    const handleSignOut = async () => {
        try {
            await set(ref(db, `users/${user.uid}/status`), 'offline');
        } catch (e) { console.error('Logout status error', e); }
        onLogout();
    };

    const handleUserContextMenu = (e, msgUser) => {
        e.preventDefault();
        const container = e.currentTarget.closest('.chat-interface');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, user: msgUser });
    };

    return (
        <div className="chat-interface" ref={containerRef}>
            <ContactSidebar
                user={user}
                status={status}
                onStatusChange={handleStatusChange}
                onSignOut={handleSignOut}
                onOpenAdmin={admin.openAdminPanel}
                contacts={contacts}
                friendStatuses={friendStatuses}
                nudgedContacts={nudgedContacts}
                currentRoom={currentRoom}
                activeContactId={activeContactId}
                onContactClick={handleContactClick}
                onRemoveContact={handleRemoveContact}
                friendRequests={friendRequests}
                onAcceptRequest={acceptRequest}
                onDeclineRequest={declineRequest}
                showNotification={showNotification}
            />

            <div className="msn-chat-area">
                <ChatHeader
                    currentRoom={currentRoom}
                    activeContact={activeContact}
                    onSelectGlobalRoom={handleSelectGlobalRoom}
                />
                <MessageList
                    messages={messages}
                    user={user}
                    contacts={contacts}
                    isTyping={isTyping}
                    activeContact={activeContact}
                    scrollKey={`${currentRoom}:${activeContactId}`}
                    onUserContextMenu={handleUserContextMenu}
                    onDeleteMessage={admin.requestDeleteMessage}
                />
                <NotificationBar notification={notification} />
                <UserContextMenu
                    menu={contextMenu}
                    currentUid={user.uid}
                    contacts={contacts}
                    onAddFriend={(target) => { setContextMenu(null); sendFriendRequest(target); }}
                />
                <Composer
                    disabled={currentRoom === 'private' && !activeContact}
                    onSend={handleSend}
                    onNudge={handleNudge}
                    onTyping={notifyTyping}
                    onStopTyping={stopTyping}
                />
            </div>

            {admin.showAdminPanel && (
                <AdminPanel
                    currentUid={user.uid}
                    allUsers={admin.allUsers}
                    onClose={admin.closeAdminPanel}
                    onMigrateEmails={admin.migrateEmails}
                    onToggleBan={admin.toggleBan}
                />
            )}

            {admin.msgToDelete && (
                <MessageBox
                    title="System Verification"
                    message="Are you sure you want to delete this message? This action is administrative."
                    type="warning"
                    buttons={['OK', 'Cancel']}
                    onResult={(res) => (res === 'OK' ? admin.confirmDeleteMessage() : admin.cancelDeleteMessage())}
                />
            )}

            {banTriggered && <BanOverlay />}
        </div>
    );
};

export default ChatInterface;
