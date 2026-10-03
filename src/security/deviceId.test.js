import { describe, it, expect } from 'vitest';
import { getDeviceId, isValidDeviceId } from './deviceId';

const memoryStorage = (initial = {}) => {
    const data = { ...initial };
    return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; }, data };
};
const fakeDoc = (cookie = '') => ({ cookie });

describe('device mark', () => {
    it('makes a random 32-character id once and keeps returning it', () => {
        const storage = memoryStorage();
        const doc = fakeDoc();
        const first = getDeviceId({ storage, document: doc });
        expect(isValidDeviceId(first)).toBe(true);
        expect(getDeviceId({ storage, document: doc })).toBe(first);
        expect(getDeviceId({ storage: memoryStorage(), document: fakeDoc() })).not.toBe(first);
    });

    it('stores it in both localStorage and a first-party cookie', () => {
        const storage = memoryStorage();
        const doc = fakeDoc();
        const id = getDeviceId({ storage, document: doc });
        expect(storage.data.gokalppoOS_deviceId).toBe(id);
        expect(doc.cookie).toContain(`gokalppo_did=${id}`);
        expect(doc.cookie).toContain('SameSite=Lax');
    });

    it('survives clearing one of the two places', () => {
        const id = 'a'.repeat(32);
        expect(getDeviceId({ storage: memoryStorage(), document: fakeDoc(`other=1; gokalppo_did=${id}`) })).toBe(id);
        expect(getDeviceId({ storage: memoryStorage({ gokalppoOS_deviceId: id }), document: fakeDoc() })).toBe(id);
    });

    it('ignores a stored value that is not a real id', () => {
        const id = getDeviceId({ storage: memoryStorage({ gokalppoOS_deviceId: '<script>' }), document: fakeDoc('gokalppo_did=nope') });
        expect(isValidDeviceId(id)).toBe(true);
    });

    it('still gives an id when storage and cookies are blocked', () => {
        const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
        const doc = { get cookie() { throw new Error('blocked'); }, set cookie(v) { throw new Error('blocked'); } };
        expect(isValidDeviceId(getDeviceId({ storage: blocked, document: doc }))).toBe(true);
    });

    it('validates the shape the database rules accept', () => {
        expect(isValidDeviceId('0123456789abcdef0123456789abcdef')).toBe(true);
        expect(isValidDeviceId('0123456789ABCDEF0123456789ABCDEF')).toBe(false);
        expect(isValidDeviceId('short')).toBe(false);
        expect(isValidDeviceId(null)).toBe(false);
    });
});
