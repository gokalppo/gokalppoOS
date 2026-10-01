// In-memory stand-in for `firebase/database`, used by component tests.
// Data is stored flat as path -> leaf value; listeners are re-run after every write.
const store = new Map();
const listeners = new Set();
let keyCounter = 0;

const norm = (p = '') => String(p).replace(/^\/+|\/+$/g, '');
const join = (a, b) => norm(`${norm(a)}/${norm(b)}`);
const isIncrement = (v) => v && typeof v === 'object' && '__increment' in v;

const clearAt = (path) => {
    for (const key of [...store.keys()]) {
        if (key === path || key.startsWith(`${path}/`)) store.delete(key);
    }
};

const writeAt = (path, value) => {
    if (isIncrement(value)) {
        store.set(path, (valueAt(path) || 0) + value.__increment);
    } else if (value && typeof value === 'object') {
        for (const [k, v] of Object.entries(value)) writeAt(join(path, k), v);
    } else if (value !== null && value !== undefined) {
        store.set(path, value);
    }
};

const valueAt = (path) => {
    if (store.has(path)) return store.get(path);
    const prefix = path ? `${path}/` : '';
    let result = null;
    for (const [key, value] of store) {
        if (!key.startsWith(prefix)) continue;
        result = result || {};
        const parts = key.slice(prefix.length).split('/');
        let node = result;
        parts.slice(0, -1).forEach((part) => { node = node[part] = node[part] || {}; });
        node[parts[parts.length - 1]] = value;
    }
    return result;
};

const snapshot = (value) => ({
    val: () => value,
    exists: () => value !== null && value !== undefined
});

// Like Firebase, only fire a listener when the data at its path actually changed.
const notify = () => {
    for (const l of [...listeners]) {
        const value = valueAt(l.path);
        const serialized = JSON.stringify(value);
        if (serialized === l.last) continue;
        l.last = serialized;
        l.cb(snapshot(value));
    }
};

const setValue = (path, value) => {
    clearAt(path);
    writeAt(path, value);
    notify();
};

export const fakeDb = {
    reset() { store.clear(); listeners.clear(); keyCounter = 0; },
    seed(path, value) { setValue(norm(path), value); },
    read(path) { return valueAt(norm(path)); }
};

export const databaseMock = {
    ref: (_db, path = '') => ({ path: norm(path) }),
    query: (r) => r,
    orderByChild: () => null,
    equalTo: () => null,
    increment: (n) => ({ __increment: n }),
    onValue: (r, cb) => {
        const value = valueAt(r.path);
        const listener = { path: r.path, cb, last: JSON.stringify(value) };
        listeners.add(listener);
        cb(snapshot(value));
        return () => listeners.delete(listener);
    },
    off: () => { },
    get: (r) => Promise.resolve(snapshot(valueAt(r.path))),
    set: (r, value) => { setValue(r.path, value); return Promise.resolve(); },
    remove: (r) => { setValue(r.path, null); return Promise.resolve(); },
    update: (r, updates) => {
        for (const [k, v] of Object.entries(updates)) {
            const path = join(r.path, k);
            if (isIncrement(v)) {
                writeAt(path, v);
            } else {
                clearAt(path);
                writeAt(path, v);
            }
        }
        notify();
        return Promise.resolve();
    },
    push: (r, value) => {
        const key = `key${String(++keyCounter).padStart(4, '0')}`;
        if (value !== undefined) setValue(join(r.path, key), value);
        const promise = Promise.resolve();
        promise.key = key;
        return promise;
    },
    onDisconnect: () => ({
        set: () => Promise.resolve(),
        remove: () => Promise.resolve()
    })
};
