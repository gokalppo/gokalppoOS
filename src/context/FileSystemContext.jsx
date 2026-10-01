import { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { STORAGE_LIMIT_CHARS } from './fsLimits';

const FileSystemContext = createContext();

export const useFileSystem = () => useContext(FileSystemContext);

const STORAGE_KEY = 'gokalppoOS_fileSystem';

// A flat id -> node map. Two permanent roots: 'root' (My Computer) and
// 'recycle' (Recycle Bin). Folders carry a `children` id array; files carry
// text `content`. Deleting a file/folder just reparents it under 'recycle'
// (and remembers where it came from so it can be restored).
const createDefaultFS = () => ({
    root: { id: 'root', type: 'folder', name: 'My Computer', parentId: null, children: ['documents', 'localdisk'] },
    documents: { id: 'documents', type: 'folder', name: 'My Documents', parentId: 'root', children: ['welcome'] },
    localdisk: { id: 'localdisk', type: 'folder', name: 'Local Disk (C:)', parentId: 'root', children: [] },
    welcome: {
        id: 'welcome',
        type: 'file',
        name: 'Welcome.txt',
        parentId: 'documents',
        content: 'gokalppoOS\'a hoş geldin!\n\nBu dosya gerçek — Notepad ile aç, düzenle, kaydet.\nYeni dosya/klasör oluşturmak için boş bir alana sağ tıkla.',
        modifiedAt: Date.now()
    },
    recycle: { id: 'recycle', type: 'folder', name: 'Recycle Bin', parentId: null, children: [] }
});

let idCounter = 0;
const genId = () => `n${Date.now()}_${idCounter++}`;

export const FileSystemProvider = ({ children }) => {
    const [nodes, setNodes] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            if (saved && saved.root && saved.recycle) return saved;
            return createDefaultFS();
        } catch {
            return createDefaultFS();
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
        } catch {
            // localStorage unavailable — state still works for this session.
        }
    }, [nodes]);

    const getNode = useCallback((id) => nodes[id], [nodes]);

    const getChildren = useCallback((folderId) => {
        const folder = nodes[folderId];
        if (!folder || !folder.children) return [];
        return folder.children.map((id) => nodes[id]).filter(Boolean);
    }, [nodes]);

    const createFolder = useCallback((parentId, name, presetId) => {
        const id = presetId || genId();
        setNodes((prev) => ({
            ...prev,
            [id]: { id, type: 'folder', name, parentId, children: [] },
            [parentId]: { ...prev[parentId], children: [...prev[parentId].children, id] }
        }));
        return id;
    }, []);

    const createFile = useCallback((parentId, name, content = '', presetId) => {
        const id = presetId || genId();
        setNodes((prev) => ({
            ...prev,
            [id]: { id, type: 'file', name, parentId, content, modifiedAt: Date.now() },
            [parentId]: { ...prev[parentId], children: [...prev[parentId].children, id] }
        }));
        return id;
    }, []);

    const renameNode = useCallback((id, newName) => {
        setNodes((prev) => ({ ...prev, [id]: { ...prev[id], name: newName } }));
    }, []);

    // Move a node into another folder (used by the Terminal's mv).
    const moveNode = useCallback((id, newParentId) => {
        setNodes((prev) => {
            const node = prev[id];
            const target = prev[newParentId];
            if (!node || !target || target.type !== 'folder' || node.parentId === newParentId) return prev;
            const oldParent = prev[node.parentId];
            return {
                ...prev,
                ...(oldParent ? { [oldParent.id]: { ...oldParent, children: oldParent.children.filter((cid) => cid !== id) } } : {}),
                [newParentId]: { ...target, children: [...target.children, id] },
                [id]: { ...node, parentId: newParentId }
            };
        });
    }, []);

    const updateFileContent = useCallback((id, content) => {
        setNodes((prev) => ({ ...prev, [id]: { ...prev[id], content, modifiedAt: Date.now() } }));
    }, []);

    // Soft-delete: move to Recycle Bin, remembering the original parent.
    const moveToRecycle = useCallback((id) => {
        setNodes((prev) => {
            const node = prev[id];
            if (!node) return prev;
            const oldParent = prev[node.parentId];
            const newOldParent = oldParent
                ? { ...oldParent, children: oldParent.children.filter((cid) => cid !== id) }
                : oldParent;
            const recycle = prev.recycle;
            return {
                ...prev,
                ...(newOldParent ? { [newOldParent.id]: newOldParent } : {}),
                [id]: { ...node, parentId: 'recycle', originalParentId: node.parentId },
                recycle: { ...recycle, children: [...recycle.children, id] }
            };
        });
    }, []);

    const restoreNode = useCallback((id) => {
        setNodes((prev) => {
            const node = prev[id];
            if (!node) return prev;
            const targetParentId = prev[node.originalParentId] ? node.originalParentId : 'root';
            const recycle = prev.recycle;
            const targetParent = prev[targetParentId];
            return {
                ...prev,
                recycle: { ...recycle, children: recycle.children.filter((cid) => cid !== id) },
                [targetParentId]: { ...targetParent, children: [...targetParent.children, id] },
                [id]: { ...node, parentId: targetParentId, originalParentId: undefined }
            };
        });
    }, []);

    // Permanently remove a node (and, if it's a folder, everything inside it).
    const permanentlyDelete = useCallback((id) => {
        setNodes((prev) => {
            const next = { ...prev };
            const collectIds = (nodeId) => {
                const node = next[nodeId];
                if (!node) return [];
                if (node.type === 'folder') {
                    return [nodeId, ...node.children.flatMap(collectIds)];
                }
                return [nodeId];
            };
            const toRemove = collectIds(id);
            const node = prev[id];
            const parent = next[node.parentId];
            if (parent) {
                next[parent.id] = { ...parent, children: parent.children.filter((cid) => cid !== id) };
            }
            toRemove.forEach((rid) => { delete next[rid]; });
            return next;
        });
    }, []);

    const emptyRecycleBin = useCallback(() => {
        setNodes((prev) => {
            const next = { ...prev };
            const collectIds = (nodeId) => {
                const node = next[nodeId];
                if (!node) return [];
                if (node.type === 'folder') {
                    return [nodeId, ...node.children.flatMap(collectIds)];
                }
                return [nodeId];
            };
            const allTrashed = prev.recycle.children.flatMap(collectIds);
            allTrashed.forEach((rid) => { delete next[rid]; });
            next.recycle = { ...prev.recycle, children: [] };
            return next;
        });
    }, []);

    // Does a file with this name already exist directly inside `parentId`? (case-insensitive)
    const findFileByName = useCallback((parentId, name) => {
        const wanted = String(name).toLowerCase();
        return Object.values(nodes).find(
            (n) => n.type === 'file' && n.parentId === parentId && n.name.toLowerCase() === wanted
        ) || null;
    }, [nodes]);

    // Would `extraChars` more data still fit on the virtual disk?
    const canStore = useCallback(
        (extraChars) => JSON.stringify(nodes).length + extraChars <= STORAGE_LIMIT_CHARS,
        [nodes]
    );

    const getPath = useCallback((id) => {
        const path = [];
        let current = nodes[id];
        while (current) {
            path.unshift(current);
            current = current.parentId ? nodes[current.parentId] : null;
        }
        return path;
    }, [nodes]);

    return (
        <FileSystemContext.Provider
            value={{
                nodes,
                getNode,
                getChildren,
                createFolder,
                createFile,
                renameNode,
                updateFileContent,
                moveNode,
                moveToRecycle,
                restoreNode,
                permanentlyDelete,
                emptyRecycleBin,
                findFileByName,
                canStore,
                getPath
            }}
        >
            {children}
        </FileSystemContext.Provider>
    );
};
