import { useState, useRef, useEffect } from 'react';
import './MenuBar.css';

// Classic Win98 menu bar. `menus`: [{ id, label, items: [{ label, shortcut?, onSelect?, disabled?, separator? }] }]
const MenuBar = ({ menus, children }) => {
    const [openId, setOpenId] = useState(null);
    const rootRef = useRef(null);

    useEffect(() => {
        if (!openId) return;
        const close = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpenId(null); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [openId]);

    const move = (delta) => {
        const index = menus.findIndex((m) => m.id === openId);
        setOpenId(menus[(index + delta + menus.length) % menus.length].id);
    };

    const handleKeyDown = (e) => {
        if (!openId) return;
        if (e.key === 'Escape') { e.stopPropagation(); setOpenId(null); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
        else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = [...rootRef.current.querySelectorAll('.mb-dropdown [role="menuitem"]:not(:disabled)')];
            if (!items.length) return;
            const index = items.indexOf(document.activeElement);
            const next = e.key === 'ArrowDown' ? index + 1 : index - 1;
            items[(next + items.length) % items.length].focus();
        }
    };

    return (
        <div className="mb-bar" role="menubar" ref={rootRef} onKeyDown={handleKeyDown}>
            {menus.map((menu) => (
                <div key={menu.id} className="mb-menu">
                    <button
                        type="button"
                        role="menuitem"
                        aria-haspopup="menu"
                        aria-expanded={openId === menu.id}
                        className={`mb-title ${openId === menu.id ? 'open' : ''}`}
                        onClick={() => setOpenId(openId === menu.id ? null : menu.id)}
                        onMouseEnter={() => { if (openId) setOpenId(menu.id); }}
                    >
                        {menu.label}
                    </button>
                    {openId === menu.id && (
                        <div className="mb-dropdown" role="menu" aria-label={menu.label}>
                            {menu.items.map((item, i) => (
                                item.separator
                                    ? <div key={`sep-${i}`} className="mb-separator" role="separator" />
                                    : (
                                        <button
                                            key={item.label}
                                            type="button"
                                            role="menuitem"
                                            className="mb-item"
                                            disabled={item.disabled}
                                            onClick={() => { setOpenId(null); item.onSelect && item.onSelect(); }}
                                        >
                                            <span>{item.label}</span>
                                            {item.shortcut && <span className="mb-shortcut">{item.shortcut}</span>}
                                        </button>
                                    )
                            ))}
                        </div>
                    )}
                </div>
            ))}
            {children}
        </div>
    );
};

export default MenuBar;
