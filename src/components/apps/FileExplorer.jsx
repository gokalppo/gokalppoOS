import React, { useState, useRef, useEffect } from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import { useLanguage } from '../../context/LanguageContext';
import { fileKind, isImageDataUrl } from './fileTypes';
import folderIcon from '../../assets/images/folder.svg';
import notepadIcon from '../../assets/images/Notepad16.svg';
import './FileExplorer.css';

// `rootId`: 'root' for My Computer, 'recycle' for Recycle Bin.
// `onOpenFile`: called with a file node when the user double-clicks a file (the caller decides what it can open).
const FileExplorer = ({ rootId, onOpenFile }) => {
    const { t } = useLanguage();
    const { getNode, getChildren, getPath, createFolder, createFile, renameNode,
        moveToRecycle, restoreNode, permanentlyDelete, emptyRecycleBin } = useFileSystem();

    const isRecycleBin = rootId === 'recycle';
    const [currentFolderId, setCurrentFolderId] = useState(rootId);
    const [selectedId, setSelectedId] = useState(null);
    const [contextMenu, setContextMenu] = useState(null); // { x, y, targetId }
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const renameInputRef = useRef(null);
    const containerRef = useRef(null);

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

    // react-draggable applies a CSS transform to the window this is rendered
    // inside, which creates a new containing block for position:fixed
    // descendants — so a fixed menu positioned with raw clientX/Y ends up
    // offset by the window's own position instead of the viewport. Position
    // the menu relative to this container instead (position:absolute + a
    // coordinate computed from the container's own bounding rect).
    const handleBackgroundContextMenu = (e) => {
        e.preventDefault();
        if (isRecycleBin) return; // No "New" actions inside the Recycle Bin.
        setSelectedId(null);
        const rect = containerRef.current.getBoundingClientRect();
        setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, targetId: null });
    };

    const handleItemContextMenu = (e, node) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedId(node.id);
        const rect = containerRef.current.getBoundingClientRect();
        setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, targetId: node.id });
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
        const name = t('fe.newFolder');
        const id = createFolder(currentFolderId, name);
        closeMenu();
        startRename({ id, name });
    };

    const handleNewTextFile = () => {
        const name = t('fe.newTextFile');
        const id = createFile(currentFolderId, name, '');
        closeMenu();
        startRename({ id, name });
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
        if (window.confirm(t('fe.confirmDelete'))) {
            permanentlyDelete(id);
        }
        closeMenu();
    };

    const handleEmptyRecycleBin = () => {
        if (window.confirm(t('fe.confirmEmpty'))) {
            emptyRecycleBin();
        }
        closeMenu();
    };

    // Pictures show a thumbnail of themselves; folders and documents get the classic icons.
    const iconFor = (node) => {
        if (node.type === 'folder') return folderIcon;
        if (fileKind(node.name) === 'image' && isImageDataUrl(node.content)) return node.content;
        return notepadIcon;
    };

    return (
        <div className="fe-container" ref={containerRef} onClick={closeMenu}>
            <div className="fe-toolbar">
                <button className="fe-up-btn" onClick={handleUp} disabled={!currentFolder?.parentId} title={t('fe.up')} aria-label={t('fe.up')}>⬆</button>
                <div className="fe-path">{path.map((n) => n.name).join(' \\ ')}</div>
                {isRecycleBin && (
                    <button className="fe-empty-btn" onClick={handleEmptyRecycleBin}>{t('fe.emptyBin')}</button>
                )}
            </div>

            <div className="fe-body" onContextMenu={handleBackgroundContextMenu}>
                {children.length === 0 && (
                    <div className="fe-empty-msg">{isRecycleBin ? t('fe.binEmpty') : t('fe.folderEmpty')}</div>
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
                            <div className="fe-context-item" onClick={handleNewFolder}>{t('fe.newFolder')}</div>
                            <div className="fe-context-item" onClick={handleNewTextFile}>{t('fe.newTextDoc')}</div>
                        </>
                    )}
                    {contextMenu.targetId && !isRecycleBin && (
                        <>
                            <div className="fe-context-item" onClick={() => startRename(getNode(contextMenu.targetId))}>{t('fe.rename')}</div>
                            <div className="fe-context-item" onClick={() => handleDelete(contextMenu.targetId)}>{t('fe.delete')}</div>
                        </>
                    )}
                    {contextMenu.targetId && isRecycleBin && (
                        <>
                            <div className="fe-context-item" onClick={() => handleRestore(contextMenu.targetId)}>{t('fe.restore')}</div>
                            <div className="fe-context-item" onClick={() => handlePermanentDelete(contextMenu.targetId)}>{t('fe.deleteForever')}</div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
