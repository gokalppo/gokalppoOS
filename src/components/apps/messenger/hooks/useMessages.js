import { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue } from 'firebase/database';
import { getMessagesPath, messagesFromSnapshot } from '../chatUtils';

const NO_MESSAGES = [];

export const useMessages = ({ currentRoom, activeContactId, uid }) => {
    const path = getMessagesPath(currentRoom, activeContactId, uid);
    // Tagged with the path it belongs to, so switching rooms shows an empty
    // list immediately instead of the previous room's messages.
    const [state, setState] = useState({ path: null, list: NO_MESSAGES });

    useEffect(() => {
        if (!path) return;
        const unsubscribe = onValue(
            ref(db, path),
            (snapshot) => setState({ path, list: messagesFromSnapshot(snapshot.val()) }),
            (error) => {
                console.error('Firebase Read Error:', error);
                setState({ path, list: NO_MESSAGES });
            }
        );
        return unsubscribe;
    }, [path]);

    return state.path === path ? state.list : NO_MESSAGES;
};
