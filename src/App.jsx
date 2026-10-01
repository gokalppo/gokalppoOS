import React, { useState, useRef, useEffect } from 'react';
import { useOS } from './context/OSContext';
import { useLanguage } from './context/LanguageContext';
import Desktop from './components/Desktop';
import Window from './components/Window'; // Eksik olan buydu!
import BootScreen from './components/BootScreen';
import AssetLoader from './components/AssetLoader';
import ScreenSaver from './components/ScreenSaver';
import BSOD from './components/BSOD';
import Clippy from './components/Clippy';
import TaskSwitcher from './components/TaskSwitcher';
import { trackAppOpen } from './analytics/appUsage';
import { prefersReducedMotion } from './display/motion';
import { useStartActions } from './components/startActions';
import { CLOSE_APP_EVENT } from './components/appBus';
import { setWindows } from './components/windowRegistry';
import { isWelcomeHidden } from './components/apps/welcomeStorage';
import { nextFocusAfterMinimize, switcherOrder, nextSwitcherIndex } from './components/windowUtils';
import './App.css';
import shutdownSound from './assets/windows98shutdown.mp3';
import windowsLogo from './assets/images/windows.png';

function App() {
  const [isBooting, setIsBooting] = useState(true); // Boot state
  const [isShuttingDown, setIsShuttingDown] = useState(false); // Shutdown state
  const [openWindows, setOpenWindows] = useState([]);
  const [focusedWindowId, setFocusedWindowId] = useState(null);
  // A plain ref (not state) so the "next" z-index is always synchronously
  // correct even when two focus events fire back-to-back (e.g. a double
  // click) before React re-renders — a state-closure value here caused
  // windows to sometimes not come to front or open behind another window.
  const zIndexCounterRef = useRef(1000);
  const getNextZIndex = () => {
    zIndexCounterRef.current += 1;
    return zIndexCounterRef.current;
  };
  const [isStartOpen, setIsStartOpen] = useState(false);
  const { t } = useLanguage();
  const { volume, playSound } = useOS(); // Use Global Volume from Context
  const [switcher, setSwitcher] = useState(null); // { ids, index } while Alt+` is held
  const closingIdsRef = useRef(new Set());

  /* REMOVED: Local Volume State & Persistence (Moved to OSContext) */

  const toggleStart = () => setIsStartOpen(!isStartOpen);

  // The Welcome window greets first-time visitors (and anyone who left it enabled).
  const welcomeActionsRef = useRef(null);
  const handleBootComplete = () => {
    setIsBooting(false);
    if (!isWelcomeHidden()) {
      setTimeout(() => welcomeActionsRef.current?.openWelcome(), 900);
    }
  };

  const handleWindowFocus = (id) => {
    setFocusedWindowId(id);
    const newZ = getNextZIndex();
    setOpenWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, zIndex: newZ, isMinimized: false } : win
      )
    );
  };

  const handleIconClick = (title, content, options = {}) => {
    // Aynı pencereden birden fazla açılmasın diye kontrol
    const id = options.id || title.toLowerCase().replace(/\s/g, '');
    const existing = openWindows.find(w => w.id === id);

    if (existing) {
      if (!existing.isClosing) {
        if (existing.isMinimized) playSound('restore');
        handleWindowFocus(id);
      }
      return;
    }

    const newZ = getNextZIndex();
    setFocusedWindowId(id);
    playSound('open');
    trackAppOpen(id);

    const newWindow = {
      id,
      title,
      content: content || `${title} içeriği buraya gelecek.`,
      isMinimized: false,
      zIndex: newZ,
      position: { x: 100, y: 100 },
      ...options // Spread custom options like bodyStyle
    };

    setOpenWindows((prev) => [...prev, newWindow]);
  };

  const handleWindowMinimize = (id) => {
    playSound('minimize');
    setFocusedWindowId(nextFocusAfterMinimize(openWindows, id));
    setOpenWindows((prev) => prev.map((win) => (win.id === id ? { ...win, isMinimized: true } : win)));
  };

  // Taskbar button: minimize the active window, otherwise restore/focus it.
  const handleTaskbarToggle = (id) => {
    const win = openWindows.find((w) => w.id === id);
    if (!win) return;
    if (focusedWindowId === id && !win.isMinimized) {
      handleWindowMinimize(id);
    } else {
      if (win.isMinimized) playSound('restore');
      handleWindowFocus(id);
    }
  };

  // "Show Desktop": minimize everything, or bring the windows back if already minimized.
  const handleShowDesktop = () => {
    const visible = openWindows.filter((w) => !w.isClosing);
    if (visible.length === 0) return;
    const allMinimized = visible.every((w) => w.isMinimized);
    playSound(allMinimized ? 'restore' : 'minimize');
    setOpenWindows((prev) => prev.map((w) => ({ ...w, isMinimized: !allMinimized })));
    setFocusedWindowId(allMinimized ? nextFocusAfterMinimize(openWindows.map((w) => ({ ...w, isMinimized: false })), null) : null);
  };

  const startActions = useStartActions(handleIconClick);
  useEffect(() => { welcomeActionsRef.current = startActions; });

  const closeWindow = (id) => {
    if (closingIdsRef.current.has(id)) return;
    closingIdsRef.current.add(id);
    playSound('close');

    if (focusedWindowId === id) setFocusedWindowId(nextFocusAfterMinimize(openWindows, id));

    const reducedMotion = prefersReducedMotion();
    const remove = () => {
      closingIdsRef.current.delete(id);
      setOpenWindows((prev) => prev.filter((win) => win.id !== id));
    };

    if (reducedMotion) {
      remove();
    } else {
      setOpenWindows((prev) => prev.map((win) => (win.id === id ? { ...win, isClosing: true } : win)));
      setTimeout(remove, 140);
    }
  };

  // The Terminal's tasklist/kill look at the open windows and can close one.
  const closeWindowRef = useRef(closeWindow);
  useEffect(() => {
    closeWindowRef.current = closeWindow;
    setWindows(openWindows);
  });
  useEffect(() => {
    const handleCloseApp = (e) => closeWindowRef.current(e.detail.id);
    window.addEventListener(CLOSE_APP_EVENT, handleCloseApp);
    return () => window.removeEventListener(CLOSE_APP_EVENT, handleCloseApp);
  }, []);

  // Alt+` (or Alt+Tab where the browser lets it through) cycles windows; releasing Alt picks one.
  const switcherRef = useRef(null);
  const openWindowsRef = useRef(openWindows);
  useEffect(() => {
    switcherRef.current = switcher;
    openWindowsRef.current = openWindows;
  }, [switcher, openWindows]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isSwitchKey = e.altKey && (e.code === 'Backquote' || e.key === 'Tab');
      if (isSwitchKey) {
        e.preventDefault();
        const current = switcherRef.current;
        const direction = e.shiftKey ? -1 : 1;
        if (!current) {
          const ids = switcherOrder(openWindowsRef.current).map((w) => w.id);
          if (ids.length === 0) return;
          setSwitcher({ ids, index: nextSwitcherIndex(0, ids.length, direction) });
        } else {
          setSwitcher({ ...current, index: nextSwitcherIndex(current.index, current.ids.length, direction) });
        }
      } else if (e.key === 'Escape' && switcherRef.current) {
        setSwitcher(null);
      }
    };

    const onKeyUp = (e) => {
      const current = switcherRef.current;
      if (e.key === 'Alt' && current) {
        const target = current.ids[current.index];
        setSwitcher(null);
        if (target && openWindowsRef.current.some((w) => w.id === target)) {
          setFocusedWindowId(target);
          const newZ = getNextZIndex();
          setOpenWindows((prev) => prev.map((w) => (w.id === target ? { ...w, zIndex: newZ, isMinimized: false } : w)));
        }
      }
    };

    const onBlur = () => setSwitcher(null);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const handleShutdown = () => {
    // 1. Audio Fix (User requested specific log)
    const audio = new Audio(shutdownSound);
    audio.volume = volume; // Apply global volume
    audio.play().catch(() => console.log('Ses çalınamadı, devam ediliyor...'));

    // 2. Visual Shutdown
    setIsShuttingDown(true);

    // 3. The Final Reload
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  };

  return (
    <div className="app-root" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AssetLoader />
      {isBooting ? (
        <BootScreen onComplete={handleBootComplete} />
      ) : (
        <>
          <Desktop
            openWindows={openWindows}
            focusedWindowId={focusedWindowId}
            onOpenWindow={handleIconClick}
            onWindowFocus={handleWindowFocus}
            onCloseWindow={closeWindow}
            onMinimizeWindow={handleWindowMinimize}
            onTaskbarToggle={handleTaskbarToggle}
            onShowDesktop={handleShowDesktop}
            isStartOpen={isStartOpen}
            toggleStart={toggleStart}
            onShutdown={handleShutdown}
          />

          <ScreenSaver />
          <BSOD />
          <Clippy openWindows={openWindows} focusedWindowId={focusedWindowId} />
          {switcher && (
            <TaskSwitcher
              windows={switcher.ids.map((id) => openWindows.find((w) => w.id === id)).filter(Boolean)}
              selectedIndex={switcher.index}
            />
          )}

          {/* BACKGROUND SHUTDOWN SCREEN */}
          {isShuttingDown && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'black',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontFamily: 'gokalppoOS'
            }}>
              <img src={windowsLogo} alt="Logo" style={{ width: '100px', marginBottom: '20px' }} />
              <h2 style={{ fontSize: '24px' }}>{t('shutdown.message')}</h2>
            </div>
          )}

          {/* PENCERELERİ EKRANDA ÇİZEN KRİTİK DÖNGÜ */}

        </>
      )}
    </div>
  );
}

export default App;
