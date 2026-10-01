import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { getMessagesPath, messagesFromSnapshot, PAGE_SIZE } from '../chatUtils';

const NO_MESSAGES = [];

// Live messages for the current room: the newest page, plus "load older" to widen the window.
export const useMessages = ({ currentRoom, activeContactId, uid }) => {
    const path = getMessagesPath(currentRoom, activeContactId, uid);

    // The window size is remembered per room, and resets when you switch rooms.
    const [windowState, setWindow] = useState({ path: null, size: PAGE_SIZE });
    const size = windowState.path === path ? windowState.size : PAGE_SIZE;

    // Tagged with the path (and window) it belongs to, so switching rooms shows an empty
    // list immediately instead of the previous room's messages.
    const [state, setState] = useState({ path: null, requested: 0, list: NO_MESSAGES });

    useEffect(() => {
        if (!path) return;
        const unsubscribe = onValue(
            query(ref(db, path), limitToLast(size)),
            (snapshot) => setState({ path, requested: size, list: messagesFromSnapshot(snapshot.val()) }),
            (error) => {
                console.error('Firebase Read Error:', error);
                setState({ path, requested: size, list: NO_MESSAGES });
            }
        );
        return unsubscribe;
    }, [path, size]);

    const current = state.path === path;
    const messages = current ? state.list : NO_MESSAGES;
    // If the server returned fewer rows than we asked for, we already have the whole history.
    const hasMore = current && messages.length >= state.requested;
    const loadingOlder = current && state.requested !== size;

    const loadOlder = useCallback(() => setWindow({ path, size: size + PAGE_SIZE }), [path, size]);

    return { messages, hasMore, loadingOlder, loadOlder };
};
