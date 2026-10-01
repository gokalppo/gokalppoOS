import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FileSystemProvider, useFileSystem } from './FileSystemContext';

const STORAGE_KEY = 'gokalppoOS_fileSystem';

const setup = () => renderHook(() => useFileSystem(), { wrapper: FileSystemProvider });

beforeEach(() => {
    localStorage.clear();
});

describe('default file system', () => {
    it('starts with My Computer, My Documents, Local Disk and a Welcome.txt', () => {
        const { result } = setup();
        const rootNames = result.current.getChildren('root').map((n) => n.name);
        expect(rootNames).toEqual(['My Documents', 'Local Disk (C:)']);
        expect(result.current.getChildren('documents').map((n) => n.name)).toEqual(['Welcome.txt']);
        expect(result.current.getChildren('recycle')).toEqual([]);
    });

    it('falls back to the default tree when localStorage holds garbage', () => {
        localStorage.setItem(STORAGE_KEY, '{not json');
        const { result } = setup();
        expect(result.current.getNode('root').name).toBe('My Computer');
    });

    it('falls back to the default tree when a saved tree lacks the permanent roots', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 1 }));
        const { result } = setup();
        expect(result.current.getNode('recycle')).toBeDefined();
    });
});

describe('creating and editing', () => {
    it('creates folders and files under a parent', () => {
        const { result } = setup();
        let folderId, fileId;
        act(() => { folderId = result.current.createFolder('localdisk', 'Projects'); });
        act(() => { fileId = result.current.createFile(folderId, 'todo.txt', 'ship it'); });

        expect(result.current.getChildren('localdisk').map((n) => n.name)).toEqual(['Projects']);
        const file = result.current.getNode(fileId);
        expect(file).toMatchObject({ type: 'file', name: 'todo.txt', content: 'ship it', parentId: folderId });
    });

    it('renames a node', () => {
        const { result } = setup();
        act(() => result.current.renameNode('welcome', 'Hello.txt'));
        expect(result.current.getNode('welcome').name).toBe('Hello.txt');
    });

    it('updates file content', () => {
        const { result } = setup();
        act(() => result.current.updateFileContent('welcome', 'new text'));
        expect(result.current.getNode('welcome').content).toBe('new text');
    });

    it('generates unique ids for rapid successive creations', () => {
        const { result } = setup();
        const ids = [];
        act(() => {
            for (let i = 0; i < 5; i++) ids.push(result.current.createFile('documents', `f${i}.txt`));
        });
        expect(new Set(ids).size).toBe(5);
    });
});

describe('recycle bin', () => {
    it('moves a node to the bin and removes it from its old parent', () => {
        const { result } = setup();
        act(() => result.current.moveToRecycle('welcome'));

        expect(result.current.getChildren('documents')).toEqual([]);
        expect(result.current.getChildren('recycle').map((n) => n.id)).toEqual(['welcome']);
        expect(result.current.getNode('welcome')).toMatchObject({ parentId: 'recycle', originalParentId: 'documents' });
    });

    it('restores a node to its original parent', () => {
        const { result } = setup();
        act(() => result.current.moveToRecycle('welcome'));
        act(() => result.current.restoreNode('welcome'));

        expect(result.current.getChildren('recycle')).toEqual([]);
        expect(result.current.getChildren('documents').map((n) => n.id)).toEqual(['welcome']);
        expect(result.current.getNode('welcome').parentId).toBe('documents');
    });

    it('restores to My Computer when the original folder no longer exists', () => {
        const { result } = setup();
        let folderId, fileId;
        act(() => { folderId = result.current.createFolder('root', 'Temp'); });
        act(() => { fileId = result.current.createFile(folderId, 'a.txt'); });
        act(() => result.current.moveToRecycle(fileId));
        act(() => result.current.moveToRecycle(folderId));
        act(() => result.current.permanentlyDelete(folderId));
        act(() => result.current.restoreNode(fileId));

        expect(result.current.getNode(fileId).parentId).toBe('root');
        expect(result.current.getChildren('root').map((n) => n.id)).toContain(fileId);
    });

    it('permanently deleting a folder removes everything inside it', () => {
        const { result } = setup();
        let folderId, childId;
        act(() => { folderId = result.current.createFolder('root', 'Stuff'); });
        act(() => { childId = result.current.createFile(folderId, 'x.txt'); });
        act(() => result.current.permanentlyDelete(folderId));

        expect(result.current.getNode(folderId)).toBeUndefined();
        expect(result.current.getNode(childId)).toBeUndefined();
        expect(result.current.getChildren('root').map((n) => n.id)).not.toContain(folderId);
    });

    it('empties the bin including nested contents, keeping the bin itself', () => {
        const { result } = setup();
        let folderId, childId;
        act(() => { folderId = result.current.createFolder('root', 'Old'); });
        act(() => { childId = result.current.createFile(folderId, 'old.txt'); });
        act(() => result.current.moveToRecycle(folderId));
        act(() => result.current.moveToRecycle('welcome'));
        act(() => result.current.emptyRecycleBin());

        expect(result.current.getChildren('recycle')).toEqual([]);
        expect(result.current.getNode(folderId)).toBeUndefined();
        expect(result.current.getNode(childId)).toBeUndefined();
        expect(result.current.getNode('welcome')).toBeUndefined();
        expect(result.current.getNode('recycle')).toBeDefined();
    });
});

describe('paths and persistence', () => {
    it('builds the path from the root down to a node', () => {
        const { result } = setup();
        expect(result.current.getPath('welcome').map((n) => n.name)).toEqual([
            'My Computer', 'My Documents', 'Welcome.txt'
        ]);
    });

    it('persists changes to localStorage and reloads them', () => {
        const first = setup();
        act(() => { first.result.current.createFolder('root', 'Saved'); });
        first.unmount();

        const second = setup();
        expect(second.result.current.getChildren('root').map((n) => n.name)).toContain('Saved');
    });
});

describe('findFileByName and canStore', () => {
    it('finds a file by name inside a folder, case-insensitively', () => {
        const { result } = setup();
        expect(result.current.findFileByName('documents', 'welcome.TXT')?.id).toBe('welcome');
        expect(result.current.findFileByName('documents', 'missing.txt')).toBeNull();
        expect(result.current.findFileByName('localdisk', 'Welcome.txt')).toBeNull();
    });

    it('says whether more data still fits on the virtual disk', () => {
        const { result } = setup();
        expect(result.current.canStore(1000)).toBe(true);
        expect(result.current.canStore(10_000_000)).toBe(false);
    });
});
