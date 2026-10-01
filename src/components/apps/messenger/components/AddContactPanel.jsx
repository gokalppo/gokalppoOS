import { useState } from 'react';
import { db } from '../../../../firebase';
import { ref, get, set, query, orderByChild, equalTo } from 'firebase/database';
import starIcon from '../../../../assets/images/star.png';
import { buildUsernameCandidates } from '../chatUtils';

// "Find Friend" form: look a user up by username and send a friend request.
const AddContactPanel = ({ user, contacts, showNotification, onClose }) => {
    const [name, setName] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const search = async () => {
        setResult(null);
        setError(null);
        const rawInput = name.trim();
        if (!rawInput) return;

        const usersRef = ref(db, 'users');
        for (const candidate of buildUsernameCandidates(rawInput)) {
            try {
                const snapshot = await get(query(usersRef, orderByChild('username'), equalTo(candidate)));
                if (snapshot.exists()) {
                    const found = snapshot.val();
                    setResult(found[Object.keys(found)[0]]);
                    return;
                }
            } catch (e) {
                console.error('Firebase Query Error:', e);
                setError('DB Error: ' + e.message);
                return;
            }
        }
        setError('User not found.');
    };

    const sendRequest = async (target) => {
        if (target.uid === user.uid) {
            setError('You cannot add yourself.');
            return;
        }
        if (contacts.some((c) => c.uid === target.uid)) {
            setError('Already in your friends list.');
            return;
        }

        const requestPath = `friendRequests/${target.uid}/${user.uid}`; // I am sending TO them
        if ((await get(ref(db, requestPath))).exists()) {
            setError('Request already pending.');
            return;
        }

        try {
            await set(ref(db, requestPath), { fromUid: user.uid, fromName: user.username, status: 'pending' });
            showNotification(`Request sent to ${target.username}!`, 'success');
            onClose();
        } catch {
            setError('Failed to send.');
        }
    };

    return (
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
            flexShrink: 0,
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && search()}
                    placeholder="Username..."
                />
                <button
                    className="login-btn"
                    onClick={search}
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

            {result && (
                <div style={{ marginTop: '4px', background: '#c0c0c0', display: 'flex', flexDirection: 'column', gap: '4px', padding: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <img src={starIcon} style={{ width: '12px', opacity: 0.5 }} alt="" />
                        <span style={{ fontWeight: 'bold' }}>User found: {result.username}</span>
                    </div>
                    <button className="login-btn" style={{ width: '100%', marginTop: 0 }} onClick={() => sendRequest(result)}>
                        Send Request
                    </button>
                </div>
            )}

            {error && (
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
                    <span style={{ fontSize: '10px', color: 'black' }}>{error}</span>
                </div>
            )}

            <button className="login-btn" style={{ marginTop: '4px' }} onClick={onClose}>
                Cancel
            </button>
        </div>
    );
};

export default AddContactPanel;
