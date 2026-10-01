import { useState } from 'react';
import MessageBox from '../../../MessageBox';
import LinkedText from './LinkedText';
import LessonsPane from './LessonsPane';
import { filterEntries, sourceOf, replyHref } from '../inboxUtils';

const FILTERS = [['all', 'All'], ['unread', 'Unread'], ['bot', '🤖 Bot'], ['form', '✉ Form']];

const when = (timestamp) => (timestamp ? new Date(timestamp).toLocaleString() : '');

// Admin-only inbox: everything visitors left through Gökalp Bot or the contact form.
const InboxPanel = ({ inbox, lessons, onClose }) => {
    const [tab, setTab] = useState('messages');
    const [filter, setFilter] = useState('all');
    const [selectedId, setSelectedId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const visible = filterEntries(inbox.entries, filter);
    const selected = inbox.entries.find((e) => e.id === selectedId) || null;

    const open = (entry) => {
        setSelectedId(entry.id);
        if (!entry.readAt) inbox.markRead(entry.id);
    };

    const handleDelete = (result) => {
        setConfirmDelete(false);
        if (result === 'OK' && selected) {
            inbox.deleteEntry(selected.id);
            setSelectedId(null);
        }
    };

    const href = selected ? replyHref(selected) : null;

    return (
        <div className="inbox-panel" role="dialog" aria-label="Inbox">
            <div className="inbox-title">
                <span>📥 Inbox{inbox.unread > 0 ? ` (${inbox.unread} unread)` : ''}</span>
                <button onClick={onClose} aria-label="Close inbox" className="inbox-close">X</button>
            </div>

            <div className="inbox-tabs" role="tablist">
                <button role="tab" aria-selected={tab === 'messages'} className={`inbox-tab${tab === 'messages' ? ' active' : ''}`} onClick={() => setTab('messages')}>
                    Messages{inbox.unread > 0 ? ` (${inbox.unread})` : ''}
                </button>
                <button role="tab" aria-selected={tab === 'lessons'} className={`inbox-tab${tab === 'lessons' ? ' active' : ''}`} onClick={() => setTab('lessons')}>
                    Bot lessons{lessons.pending.length > 0 ? ` (${lessons.pending.length})` : ''}
                </button>
            </div>

            {tab === 'lessons' ? <LessonsPane lessons={lessons} /> : (<>
            <div className="inbox-toolbar">
                {FILTERS.map(([id, label]) => (
                    <button
                        key={id}
                        className={`inbox-filter${filter === id ? ' active' : ''}`}
                        aria-pressed={filter === id}
                        onClick={() => setFilter(id)}
                    >
                        {label}
                    </button>
                ))}
                <button className="inbox-filter inbox-markall" onClick={inbox.markAllRead} disabled={inbox.unread === 0}>
                    Mark all read
                </button>
            </div>

            <div className="inbox-body-wrap">
                <div className="inbox-list" role="list">
                    {visible.length === 0 && (
                        <div className="inbox-empty">
                            {inbox.entries.length === 0 ? 'No messages yet.' : 'Nothing here with this filter.'}
                        </div>
                    )}
                    {visible.map((entry) => (
                        <button
                            key={entry.id}
                            role="listitem"
                            className={`inbox-row${entry.readAt ? '' : ' unread'}${entry.id === selectedId ? ' selected' : ''}`}
                            onClick={() => open(entry)}
                        >
                            <span className="inbox-row-top">
                                <span className="inbox-from">{sourceOf(entry) === 'bot' ? '🤖 ' : '✉ '}{entry.from || '(unknown)'}</span>
                                <span className="inbox-date">{when(entry.timestamp)}</span>
                            </span>
                            <span className="inbox-subject">{entry.subject}</span>
                        </button>
                    ))}
                </div>

                <div className="inbox-detail">
                    {!selected ? (
                        <div className="inbox-empty">Select a message to read it.</div>
                    ) : (
                        <>
                            <div className="inbox-meta">
                                <div><strong>From:</strong> {selected.from}</div>
                                <div><strong>Subject:</strong> {selected.subject}</div>
                                <div><strong>Received:</strong> {when(selected.timestamp)}</div>
                                <div><strong>Via:</strong> {sourceOf(selected) === 'bot' ? 'Gökalp Bot' : (selected.sentVia || 'contact form')}</div>
                            </div>
                            <div className="inbox-message"><LinkedText text={selected.body} /></div>
                            <div className="inbox-actions">
                                {href && <a className="inbox-btn" href={href}>Reply by e-mail</a>}
                                <button className="inbox-btn" onClick={() => inbox.markUnread(selected.id)}>Mark unread</button>
                                <button className="inbox-btn danger" onClick={() => setConfirmDelete(true)}>Delete</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            </>)}

            {confirmDelete && (
                <MessageBox
                    title="Delete message"
                    message="Delete this message for good? This cannot be undone."
                    type="warning"
                    buttons={['OK', 'Cancel']}
                    onResult={handleDelete}
                />
            )}
        </div>
    );
};

export default InboxPanel;
