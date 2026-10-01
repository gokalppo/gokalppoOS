import { useRef, useEffect } from 'react';
import starIcon from '../../../../assets/images/star.png';
import { formatTime } from '../chatUtils';

const MessageList = ({ messages, user, contacts, isTyping, activeContact, scrollKey, onUserContextMenu, onDeleteMessage }) => {
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, scrollKey]);

    return (
        <div className="chat-history">
            {messages.map((msg) => (
                <div key={msg.key} className="msg-entry">
                    {msg.type === 'nudge' ? (
                        <div className="nudge-alert">
                            {msg.senderUid === user.uid ? 'You sent a nudge!' : `${msg.senderName || 'User'} sent a nudge!`}
                        </div>
                    ) : (
                        <div className={`msg-line ${msg.senderUid === user.uid ? 'me' : 'them'}`}>
                            <div className="msg-meta" style={{ color: msg.senderUid === user.uid ? 'purple' : 'navy' }}>
                                <span
                                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                    onClick={(e) => { e.stopPropagation(); onUserContextMenu(e, msg); }}
                                >
                                    {msg.senderUid === user.uid ? 'You' : (msg.senderName || 'User')}
                                </span>

                                {contacts.some((c) => c.uid === msg.senderUid) && (
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
                                                onClick={(e) => { e.stopPropagation(); onDeleteMessage(msg); }}
                                                title="Delete Message"
                                                style={{ color: 'red', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold', fontSize: '10px' }}
                                            >
                                                [x]
                                            </span>
                                        )}
                                    </>
                                )}
                                {!msg.isDeleted && msg.senderUid === user.uid && msg.read && <span className="msg-tick-read">✓</span>}
                            </span>
                        </div>
                    )}
                </div>
            ))}
            {isTyping && activeContact && <div className="typing-indicator">{activeContact.name} is typing...</div>}
            <div ref={endRef} />
        </div>
    );
};

export default MessageList;
