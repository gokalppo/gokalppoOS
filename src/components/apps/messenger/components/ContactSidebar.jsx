import { useState, useEffect } from 'react';
import starIcon from '../../../../assets/images/star.png';
import AddContactPanel from './AddContactPanel';
import FriendRequests from './FriendRequests';
import { GUEST_FRIENDS_MESSAGE } from '../chatUtils';

const ContactSidebar = ({
    user, status, onStatusChange, onSignOut, onOpenAdmin, onOpenInbox, inboxUnread = 0,
    contacts, friendStatuses, nudgedContacts, currentRoom, activeContactId,
    onContactClick, onRemoveContact,
    friendRequests, onAcceptRequest, onDeclineRequest, showNotification,
    botActive, onBotClick
}) => {
    const [showAddContact, setShowAddContact] = useState(false);
    const [musicTrack, setMusicTrack] = useState('');

    useEffect(() => {
        const handleMusicUpdate = (e) => setMusicTrack(e.detail.track);
        window.addEventListener('music-update', handleMusicUpdate);
        return () => window.removeEventListener('music-update', handleMusicUpdate);
    }, []);

    return (
        <div className="msn-sidebar">
            <div className="user-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{user.username || user.email?.split('@')[0] || 'Guest'}</strong>
                    <button className="tool-btn" onClick={onSignOut} title="Sign Out" style={{ fontSize: '10px', color: 'red' }}>[X]</button>
                </div>
                {user.role === 'admin' && (
                    <button
                        className="tool-btn"
                        style={{ width: '100%', marginTop: '5px', background: 'darkred', color: 'white', fontWeight: 'bold' }}
                        onClick={onOpenAdmin}
                    >
                        🚫 Admin Tools
                    </button>
                )}
                {user.role === 'admin' && (
                    <button
                        className="tool-btn"
                        style={{ width: '100%', marginTop: '5px', fontWeight: 'bold' }}
                        onClick={onOpenInbox}
                    >
                        📥 Inbox{inboxUnread > 0 ? ` (${inboxUnread})` : ''}
                    </button>
                )}
                <select
                    className="user-status-select"
                    value={status}
                    onChange={(e) => onStatusChange(e.target.value)}
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
                <div
                    className={`msn-contact bot-contact ${botActive ? 'active' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={onBotClick}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onBotClick(); } }}
                >
                    <div className="contact-item-container" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div className="status-dot online"></div>
                        <span style={{ marginLeft: '6px' }}>🤖 Gökalp Bot</span>
                    </div>
                </div>
                {contacts.map((c) => (
                    <div
                        key={c.uid}
                        className={`msn-contact ${currentRoom === 'private' && activeContactId === c.uid ? 'active' : ''}`}
                        onClick={() => onContactClick(c.uid)}
                    >
                        <div className="contact-item-container" style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <div className={`status-dot ${friendStatuses[c.uid] || c.status || 'offline'}`}></div>

                            <span style={{ display: 'flex', alignItems: 'center', marginLeft: '6px' }}>
                                <img src={starIcon} alt="Friend" style={{ width: '12px', height: '12px', marginRight: '5px' }} />
                                {c.name}
                                {nudgedContacts[c.uid] && (
                                    <span style={{ color: 'red', fontWeight: 'bold', marginLeft: '4px', animation: 'blink 1s infinite' }}>!!</span>
                                )}
                            </span>

                            {c.unreadCount > 0 && (
                                <div className="unread-badge">({c.unreadCount})</div>
                            )}
                        </div>

                        <button
                            className="tool-btn"
                            style={{ fontSize: '10px', padding: '0 2px', lineHeight: '10px' }}
                            onClick={(e) => onRemoveContact(e, c.uid, c.name)}
                            title="Unfriend"
                        >
                            x
                        </button>
                    </div>
                ))}
            </div>

            {showAddContact ? (
                <AddContactPanel
                    user={user}
                    contacts={contacts}
                    showNotification={showNotification}
                    onClose={() => setShowAddContact(false)}
                />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <button
                        className="login-btn"
                        style={{ fontSize: '10px' }}
                        onClick={() => (user.isGuest ? showNotification(GUEST_FRIENDS_MESSAGE, 'warning') : setShowAddContact(true))}
                    >
                        + Add Contact
                    </button>
                    <FriendRequests requests={friendRequests} onAccept={onAcceptRequest} onDecline={onDeclineRequest} />
                </div>
            )}
        </div>
    );
};

export default ContactSidebar;
