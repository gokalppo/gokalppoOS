import { useState, useRef, useEffect } from 'react';
import './StartMenu.css';
import { useLanguage } from '../context/LanguageContext';
import documentsIcon from '../assets/images/documents.png';
import helpIcon from '../assets/images/help.png';
import computerIcon from '../assets/images/This_PC_1995.svg';
import programsIcon from '../assets/images/folder.svg';

const Item = ({ icon, label, arrow, onClick, onMouseEnter, expanded, ...rest }) => (
  <button
    type="button"
    role="menuitem"
    className="start-item"
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    aria-haspopup={arrow ? 'menu' : undefined}
    aria-expanded={arrow ? expanded : undefined}
    {...rest}
  >
    <span className="icon">{typeof icon === 'string' ? <img src={icon} alt="" style={{ width: '24px' }} /> : icon}</span>
    <span className="label">{label}</span>
    {arrow && <span className="arrow">▶</span>}
  </button>
);

const StartMenu = ({ isOpen, onClose, onLaunch, onShutdown, programs = [], actions, onRun }) => {
  const { t } = useLanguage();
  const [openSub, setOpenSub] = useState(null); // 'programs' | 'settings' | null
  const menuRef = useRef(null);

  // Closing the menu also closes its submenus (adjusted during render, not in an effect).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setOpenSub(null);
  }

  // Focus the first entry when the menu opens.
  useEffect(() => {
    if (isOpen) menuRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const finish = (fn) => () => {
    setOpenSub(null);
    fn();
    if (onClose) onClose();
  };

  const launchProgram = (app) => finish(() => onLaunch(app.title, app.content, { icon: app.icon, ...app.options }));

  const moveFocus = (container, delta) => {
    const items = [...container.querySelectorAll(':scope > [role="menuitem"], :scope > .start-item-wrap > [role="menuitem"]')];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement);
    items[(index + delta + items.length) % items.length].focus();
  };

  const handleKeyDown = (e) => {
    const target = e.target;
    const menu = target.closest('[role="menu"]');
    if (!menu) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveFocus(menu, e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'ArrowRight' && target.getAttribute('aria-haspopup')) {
      e.preventDefault();
      const key = target.dataset.sub;
      setOpenSub(key);
      requestAnimationFrame(() => target.parentElement.querySelector('.start-submenu [role="menuitem"]')?.focus());
    } else if (e.key === 'ArrowLeft' && menu.classList.contains('start-submenu')) {
      e.preventDefault();
      menu.parentElement.querySelector(':scope > [role="menuitem"]')?.focus();
      setOpenSub(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (menu.classList.contains('start-submenu')) {
        menu.parentElement.querySelector(':scope > [role="menuitem"]')?.focus();
        setOpenSub(null);
      } else if (onClose) {
        onClose();
      }
    }
  };

  // Hover opens a submenu; a click (touch) opens it too and never closes it again.
  const openSubmenu = (key) => () => setOpenSub(key);

  return (
    <div className="start-menu" ref={menuRef} onKeyDown={handleKeyDown} onClick={(e) => e.stopPropagation()}>
      <div className="start-side-bar">
        <span className="os-version">gokalppoOS</span>
      </div>
      <div className="start-content" role="menu" aria-label="Start">
        <div className="start-item-wrap static">
          <Item
            icon={programsIcon}
            label={t('start.programs')}
            arrow
            expanded={openSub === 'programs'}
            data-sub="programs"
            onClick={openSubmenu('programs')}
            onMouseEnter={() => setOpenSub('programs')}
          />
          {openSub === 'programs' && (
            <div className="start-submenu" role="menu" aria-label={t('start.programs')}>
              {programs.map((app) => (
                <Item key={app.id} icon={app.icon} label={app.title} onClick={launchProgram(app)} />
              ))}
            </div>
          )}
        </div>
        <Item icon={documentsIcon} label={t('start.documents')} onClick={finish(actions.openDocuments)} onMouseEnter={() => setOpenSub(null)} />
        <div className="start-item-wrap">
          <Item
            icon="⚙️"
            label={t('start.settings')}
            arrow
            expanded={openSub === 'settings'}
            data-sub="settings"
            onClick={openSubmenu('settings')}
            onMouseEnter={() => setOpenSub('settings')}
          />
          {openSub === 'settings' && (
            <div className="start-submenu" role="menu" aria-label={t('start.settings')}>
              <Item icon={computerIcon} label={t('start.displayProperties')} onClick={finish(actions.openDisplayProperties)} />
              <Item icon={computerIcon} label={t('start.systemProperties')} onClick={finish(actions.openSystemProperties)} />
            </div>
          )}
        </div>
        <Item icon={helpIcon} label={t('start.help')} onClick={finish(actions.openHelp)} onMouseEnter={() => setOpenSub(null)} />
        <Item icon="▶️" label={t('start.run')} onClick={finish(onRun)} onMouseEnter={() => setOpenSub(null)} />
        <div className="divider"></div>
        <Item icon="🛑" label={t('start.shutdown')} onClick={() => onShutdown && onShutdown('shutdown')} onMouseEnter={() => setOpenSub(null)} />
      </div>
    </div>
  );
};

export default StartMenu;
