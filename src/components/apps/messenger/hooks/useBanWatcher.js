import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../../../firebase';
import { ref, onValue } from 'firebase/database';
import bannedSoundFile from '../../../../assets/banned.mp3';

// Watches the signed-in user's own isBanned flag. When it flips to true the
// kill-switch overlay is shown and the session is terminated after 3 seconds.
export const useBanWatcher = ({ uid, volume, onLogout }) => {
    const [banTriggered, setBanTriggered] = useState(false);
    const volumeRef = useRef(volume);
    const onLogoutRef = useRef(onLogout);

    useEffect(() => {
        volumeRef.current = volume;
        onLogoutRef.current = onLogout;
    }, [volume, onLogout]);

    useEffect(() => {
        if (!uid) return;
        let killTimer;

        const unsubscribe = onValue(ref(db, `users/${uid}/isBanned`), (snap) => {
            if (snap.val() !== true) return;
            setBanTriggered(true);

            const audio = new Audio(bannedSoundFile);
            audio.volume = volumeRef.current;
            audio.play().catch((e) => console.error(e));

            killTimer = setTimeout(() => {
                auth.signOut().catch(console.error);
                if (onLogoutRef.current) onLogoutRef.current();
            }, 3000);
        });

        return () => {
            unsubscribe();
            clearTimeout(killTimer);
        };
    }, [uid]);

    return banTriggered;
};
