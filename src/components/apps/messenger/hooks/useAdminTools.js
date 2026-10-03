import { useState, useCallback } from 'react';
import { db } from '../../../../firebase';
import { ref, get, update } from 'firebase/database';
import { getMessagesPath, mergeUsersWithPrivate } from '../chatUtils';
import { sortUsage } from '../../../../analytics/appUsage';
import { getDeviceId } from '../../../../security/deviceId';

// Admin-only actions: user list / bans, email migration, message removal.
// The database rules enforce the role; this only drives the UI.
export const useAdminTools = ({ user, currentRoom, activeContactId, showNotification }) => {
    const isAdmin = user.role === 'admin';
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [allUsers, setAllUsers] = useState([]);
    const [msgToDelete, setMsgToDelete] = useState(null);
    const [appUsage, setAppUsage] = useState([]);

    const loadAllUsers = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const [usersSnap, privateSnap] = await Promise.all([
                get(ref(db, 'users')),
                get(ref(db, 'userPrivate'))
            ]);
            if (usersSnap.exists()) {
                setAllUsers(mergeUsersWithPrivate(usersSnap.val(), privateSnap.val() || {}));
            }
        } catch (e) { console.error(e); }
    }, [isAdmin]);

    const loadAppUsage = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const snap = await get(ref(db, 'analytics/appOpens'));
            setAppUsage(sortUsage(snap.val()));
        } catch (e) { console.error(e); }
    }, [isAdmin]);

    const openAdminPanel = useCallback(() => {
        setShowAdminPanel(true);
        loadAllUsers();
        loadAppUsage();
    }, [loadAllUsers, loadAppUsage]);

    const closeAdminPanel = useCallback(() => setShowAdminPanel(false), []);

    // One-time migration: legacy users/{uid}/email -> userPrivate/{uid}/email
    const migrateEmails = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const users = (await get(ref(db, 'users'))).val() || {};
            let migrated = 0;
            for (const [uid, data] of Object.entries(users)) {
                if (data.email) {
                    await update(ref(db, `userPrivate/${uid}`), { email: data.email });
                    await update(ref(db, `users/${uid}`), { email: null });
                    migrated++;
                }
            }
            showNotification(`Migrated ${migrated} user(s)' email to userPrivate.`, 'success');
            loadAllUsers();
        } catch (e) { showNotification('Migration error: ' + e.message, 'error'); }
    }, [isAdmin, showNotification, loadAllUsers]);

    const toggleBan = useCallback(async (targetUid, currentlyBanned) => {
        if (!isAdmin) return;
        try {
            // A ban also covers the browser that person used, so a fresh guest or account there does not undo it.
            // The admin's own browser is never banned this way (it could lock the admin out).
            const deviceId = (await get(ref(db, `userPrivate/${targetUid}/deviceId`))).val();
            const deviceBannable = Boolean(deviceId) && deviceId !== getDeviceId();
            const updates = { [`users/${targetUid}/isBanned`]: !currentlyBanned };
            if (deviceBannable) updates[`bannedDevices/${deviceId}`] = currentlyBanned ? null : true;
            await update(ref(db), updates);
            showNotification(`User ${!currentlyBanned ? 'BANNED' : 'UNBANNED'}${deviceBannable ? ' (and their device)' : ''}`, 'success');
            loadAllUsers();
        } catch (e) { showNotification('Ban error: ' + e.message, 'error'); }
    }, [isAdmin, showNotification, loadAllUsers]);

    const requestDeleteMessage = useCallback((msg) => {
        if (isAdmin) setMsgToDelete(msg);
    }, [isAdmin]);

    const cancelDeleteMessage = useCallback(() => setMsgToDelete(null), []);

    const confirmDeleteMessage = useCallback(async () => {
        if (!msgToDelete) return;
        try {
            const base = getMessagesPath(currentRoom, activeContactId, user.uid);
            // Soft delete with a visible placeholder.
            await update(ref(db, `${base}/${msgToDelete.key}`), {
                text: 'This message was removed by admin',
                isDeleted: true
            });
            setMsgToDelete(null);
        } catch (e) { showNotification('Delete error: ' + e.message, 'error'); }
    }, [msgToDelete, currentRoom, activeContactId, user.uid, showNotification]);

    return {
        isAdmin, showAdminPanel, openAdminPanel, closeAdminPanel, allUsers, appUsage,
        migrateEmails, toggleBan,
        msgToDelete, requestDeleteMessage, cancelDeleteMessage, confirmDeleteMessage
    };
};
