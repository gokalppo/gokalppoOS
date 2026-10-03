// Is this browser on the "banned devices" list? Checked before signing in, signing up or continuing as a guest.
// (The database rules enforce the ban too; this just gives a clear message and avoids creating accounts.)
import { db } from '../../../firebase';
import { ref, get } from 'firebase/database';
import { getDeviceId } from '../../../security/deviceId';

export const BANNED_DEVICE_MESSAGE = 'This device has been banned from gokalppoOS.';

export const isThisDeviceBanned = async () => {
    try {
        return (await get(ref(db, `bannedDevices/${getDeviceId()}`))).val() === true;
    } catch {
        return false; // offline or blocked: sign-in itself will fail with its own message
    }
};
