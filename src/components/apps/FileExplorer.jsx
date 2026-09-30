import React, { useState, useRef, useEffect } from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import folderIcon from '../../assets/images/folder.svg';
import notepadIcon from '../../assets/images/Notepad16.svg';
import './FileExplorer.css';

// `rootId`: 'root' for My Computer, 'recycle' for Recycle Bin.
// `onOpenFile`: called with a file node when the user double-clicks a .txt file.
const FileExplorer = ({ rootId, onOpenFile }) => {
    const { getNode, getChildren, getPath, createFolder, createFile, renameNode,
        moveToRecycle, restoreNode, permanentlyDelete, emptyRecycleBin } = useFileSystem();

    const isRecycleBin = rootId === 'recycle';
    const [currentFolderId, setCurrentFolderId] = useState(rootId);
    const [selectedId, setSelectedId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, targetId }
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef(null);

    const currentFolder = getNode(currentFolderId);
    const children = getChildren(currentFolderId);
    const path = getPath(currentFolderId);

    useEffect(() => {
        if (renamingId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renamingId]);

    const closeMenu = () => setContextMenu(null);

    const handleItemDoubleClick = (node) => {
        if (node.type === 'folder') {
            setCurrentFolderId(node.id);
            setSelectedId(null);
        } else if (onOpenFile) {
            onOpenFile(node);
        }
    };

    const handleUp = () => {
        if (currentFolder?.parentId) {
            setCurrentFolderId(currentFolder.parentId);
            setSelectedId(null);
        }
    };

    const handleBackgroundContextMenu = (e) => {
        e.preventDefault();
        if (isRecycleBin) return; // No "New" actions inside the Recycle Bin.
        setSelectedId(null);
        setContextMenu({ x: e.clientX, y: e.clientY, targetId: null });
    };

    const handleItemContextMenu = (e, node) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(node.id);
        setContextMenu({ x: e.clientX, y: e.clientY, targetId: node.id });
    };

    const startRename = (node) => {
        setRenamingId(node.id);
        setRenameValue(node.name);
        closeMenu();
    };

    const commitRename = () => {
        if (renamingId && renameValue.trim()) {
            renameNode(renamingId, renameValue.trim());
        }
        setRenamingId(null);
    };

    const handleNewFolder = () => {
        const id = createFolder(currentFolderId, 'New Folder');
        closeMenu();
        startRename({ id, name: 'New Folder' });
    };

    const handleNewTextFile = () => {
        const id = createFile(currentFolderId, 'New Text Document.txt', '');
        closeMenu();
        startRename({ id, name: 'New Text Document.txt' });
    };

    const handleDelete = (id) => {
        moveToRecycle(id);
        closeMenu();
    };

    const handleRestore = (id) => {
        restoreNode(id);
        closeMenu();
    };

    const handlePermanentDelete = (id) => {
        if (window.confirm('Permanently delete this item? This cannot be undone.')) {
            permanentlyDelete(id);
        }
        closeMenu();
    };

    const handleEmptyRecycleBin = () => {
        if (window.confirm('Permanently delete all items in the Recycle Bin?')) {
            emptyRecycleBin();
        }
        closeMenu();
    };

    const iconFor = (node) => (node.type === 'folder' ? folderIcon : notepadIcon);

    return (
        <div className="fe-container" onClick={closeMenu}>
            <div className="fe-toolbar">
                <button className="fe-up-btn" onClick={handleUp} disabled={!currentFolder?.parentId} title="Up">⬆</button>
                <div className="fe-path">{path.map((n) => n.name).join(' \\ ')}</div>
                {isRecycleBin && (
                    <button className="fe-empty-btn" onClick={handleEmptyRecycleBin}>Empty Recycle Bin</button>
                )}
            </div>

            <div className="fe-body" onContextMenu={handleBackgroundContextMenu}>
                {children.length === 0 && (
                    <div className="fe-empty-msg">{isRecycleBin ? 'Recycle Bin is empty' : 'This folder is empty'}</div>
                )}
                {children.map((node) => (
                    <div
                        key={node.id}
                        className={`fe-item ${selectedId === node.id ? 'selected' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); }}
                        onDoubleClick={() => handleItemDoubleClick(node)}
                        onContextMenu={(e) => handleItemContextMenu(e, node)}
                    >
                        <img src={iconFor(node)} alt="" className="fe-item-icon" />
                        {renamingId === node.id ? (
                            <input
                                ref={renameInputRef}
                                className="fe-rename-input"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onBlur={commitRename}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') commitRename();
                                    if (e.key === 'Escape') setRenamingId(null);
                                }}
                            />
                        ) : (
                            <span className="fe-item-name">{node.name}</span>
                        )}
                    </div>
                ))}
            </div>

            {contextMenu && (
                <div
                    className="fe-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {!contextMenu.targetId && !isRecycleBin && (
                        <>
                            <div className="fe-context-item" onClick={handleNewFolder}>New Folder</div>
                            <div className="fe-context-item" onClick={handleNewTextFile}>New Text Document</div>
                        </>
                    )}
                    {contextMenu.targetId && !isRecycleBin && (
                        <>
                            <div className="fe-context-item" onClick={() => startRename(getNode(contextMenu.targetId))}>Rename</div>
                            <div className="fe-context-item" onClick={() => handleDelete(contextMenu.targetId)}>Delete</div>
                        </>
                    )}
                    {contextMenu.targetId && isRecycleBin && (
                        <>
                            <div className="fe-context-item" onClick={() => handleRestore(contextMenu.targetId)}>Restore</div>
                            <div className="fe-context-item" onClick={() => handlePermanentDelete(contextMenu.targetId)}>Delete Permanently</div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
