import { useState } from 'react';
import MessageBox from '../../../MessageBox';
import { lessonWarning } from '../hooks/useLessons';
import { TEACH_Q_MAX, TEACH_A_MAX } from '../botModeration';

const WARNINGS = {
    short: 'very short', long: 'too long', link: 'contains a link', contact: 'contains contact details', spam: 'looks like spam', rude: 'may be rude'
};

const when = (timestamp) => (timestamp ? new Date(timestamp).toLocaleString() : '');

// Admin view of what visitors taught the bot: approve (optionally after fixing a typo), reject, or take back.
const LessonsPane = ({ lessons }) => {
    const [view, setView] = useState('pending');
    const [selectedId, setSelectedId] = useState(null);
    const [edits, setEdits] = useState({});
    const [confirm, setConfirm] = useState(null); // 'reject' | 'revoke'

    const list = view === 'pending' ? lessons.pending : lessons.approved;
    const selected = list.find((l) => l.id === selectedId) || null;
    const draft = selected ? { q: edits[selected.id]?.q ?? selected.q, a: edits[selected.id]?.a ?? selected.a } : null;
    const warning = selected && view === 'pending' ? lessonWarning({ q: draft.q, a: draft.a }) : null;

    const setDraft = (field, value) => setEdits((prev) => ({ ...prev, [selected.id]: { ...draft, [field]: value } }));

    const handleConfirm = (result) => {
        const kind = confirm;
        setConfirm(null);
        if (result !== 'OK' || !selected) return;
        if (kind === 'reject') lessons.reject(selected.id);
        else lessons.revoke(selected.id);
        setSelectedId(null);
    };

    return (
        <div className="lessons-pane">
            <div className="inbox-toolbar">
                <button className={`inbox-filter${view === 'pending' ? ' active' : ''}`} aria-pressed={view === 'pending'} onClick={() => { setView('pending'); setSelectedId(null); }}>
                    Waiting ({lessons.pending.length})
                </button>
                <button className={`inbox-filter${view === 'approved' ? ' active' : ''}`} aria-pressed={view === 'approved'} onClick={() => { setView('approved'); setSelectedId(null); }}>
                    Approved ({lessons.approved.length})
                </button>
            </div>

            <div className="inbox-body-wrap">
                <div className="inbox-list" role="list" aria-label="Lessons">
                    {list.length === 0 && (
                        <div className="inbox-empty">{view === 'pending' ? 'Nothing is waiting for approval.' : 'No approved lessons yet.'}</div>
                    )}
                    {list.map((lesson) => (
                        <button
                            key={lesson.id}
                            role="listitem"
                            className={`inbox-row${view === 'pending' ? ' unread' : ''}${lesson.id === selectedId ? ' selected' : ''}`}
                            onClick={() => setSelectedId(lesson.id)}
                        >
                            <span className="inbox-row-top">
                                <span className="inbox-from">{lesson.q}</span>
                                <span className="inbox-date">{lesson.lang.toUpperCase()}</span>
                            </span>
                            <span className="inbox-subject">{lesson.a}</span>
                        </button>
                    ))}
                </div>

                <div className="inbox-detail">
                    {!selected ? (
                        <div className="inbox-empty">Select a lesson to review it.</div>
                    ) : (
                        <>
                            <div className="inbox-meta">
                                <div><strong>Language:</strong> {selected.lang === 'tr' ? 'Turkish' : 'English'}</div>
                                <div><strong>{view === 'pending' ? 'Taught' : 'Approved'}:</strong> {when(view === 'pending' ? selected.timestamp : selected.approvedAt)}</div>
                                {warning && <div className="lesson-warning" role="alert">⚠ This lesson {WARNINGS[warning]}.</div>}
                            </div>
                            <label className="lesson-field">
                                When someone says:
                                <input
                                    type="text" value={draft.q} maxLength={TEACH_Q_MAX} disabled={view !== 'pending'}
                                    onChange={(e) => setDraft('q', e.target.value)} aria-label="When someone says"
                                />
                            </label>
                            <label className="lesson-field">
                                The bot answers:
                                <textarea
                                    value={draft.a} maxLength={TEACH_A_MAX} disabled={view !== 'pending'}
                                    onChange={(e) => setDraft('a', e.target.value)} aria-label="The bot answers"
                                />
                            </label>
                            <div className="inbox-actions">
                                {view === 'pending' ? (
                                    <>
                                        <button className="inbox-btn" onClick={() => lessons.approve(selected, draft).then((ok) => ok && setSelectedId(null))}>Approve</button>
                                        <button className="inbox-btn danger" onClick={() => setConfirm('reject')}>Reject</button>
                                    </>
                                ) : (
                                    <button className="inbox-btn danger" onClick={() => setConfirm('revoke')}>Remove</button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {confirm && (
                <MessageBox
                    title={confirm === 'reject' ? 'Reject lesson' : 'Remove lesson'}
                    message={confirm === 'reject' ? 'Throw this lesson away?' : 'Remove this lesson? The bot will stop using it for everyone.'}
                    type="warning"
                    buttons={['OK', 'Cancel']}
                    onResult={handleConfirm}
                />
            )}
        </div>
    );
};

export default LessonsPane;
