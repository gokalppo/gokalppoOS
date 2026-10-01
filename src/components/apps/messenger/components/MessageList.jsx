import { useRef, useLayoutEffect } from 'react';
import starIcon from '../../../../assets/images/star.png';
import { formatTime, messageStatus } from '../chatUtils';

const MessageList = ({
    messages, user, contacts, isTyping, activeContact, scrollKey,
    onUserContextMenu, onDeleteMessage,
    hasMore = false, loadingOlder = false, onLoadOlder,
    peerReadAt // number | null in a private chat (enables ✓ / ✓✓ ticks); undefined elsewhere
}) => {
    const endRef = useRef(null);
    const listRef = useRef(null);
    const trackRef = useRef({ scrollKey: null, newest: null, oldest: null, height: 0 });

    // New messages scroll to the bottom; older messages loaded above keep the view where it was.
    useLayoutEffect(() => {
        const el = listRef.current;
        const track = trackRef.current;
        const newest = messages[messages.length - 1]?.key ?? null;
        const oldest = messages[0]?.key ?? null;

        const prepended = track.scrollKey === scrollKey && track.oldest && oldest !== track.oldest && newest === track.newest;
        if (prepended && el) {
            el.scrollTop += el.scrollHeight - track.height;
        } else if (track.scrollKey !== scrollKey || newest !== track.newest) {
            endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }

        trackRef.current = { scrollKey, newest, oldest, height: el ? el.scrollHeight : 0 };
    }, [messages, scrollKey]);

    return (
        <div className="chat-history" ref={listRef}>
            {hasMore && (
                <button className="load-older-btn" onClick={onLoadOlder} disabled={loadingOlder}>
                    {loadingOlder ? 'Loading...' : 'Load older messages'}
                </button>
            )}
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
                                {!msg.isDeleted && msg.senderUid === user.uid && peerReadAt !== undefined && (
                                    messageStatus(msg, peerReadAt) === 'read'
                                        ? <span className="msg-tick-read" title="Read" aria-label="Read">✓✓</span>
                                        : <span className="msg-tick-sent" title="Sent" aria-label="Sent">✓</span>
                                )}
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
