import { useState, useEffect } from 'react';
import { db } from '../../../../firebase';
import { ref, onValue } from 'firebase/database';
import { requestsFromSnapshot } from '../chatUtils';

// Live friends list and pending incoming friend requests.
export const useFriendData = (uid) => {
    const [contacts, setContacts] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);

    useEffect(() => {
        const unsubscribe = onValue(ref(db, `friendRequests/${uid}`), (snapshot) => {
            setFriendRequests(requestsFromSnapshot(snapshot.val()));
        });
        return () => unsubscribe();
    }, [uid]);

    useEffect(() => {
        const unsubscribe = onValue(ref(db, `users/${uid}/friends`), (snapshot) => {
            const data = snapshot.val();
            setContacts(data ? Object.values(data) : []);
        });
        return () => unsubscribe();
    }, [uid]);

    return { contacts, friendRequests };
};
