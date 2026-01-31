import React, { useState, useEffect } from 'react';
import { useOS } from './context/OSContext';
import Desktop from './components/Desktop';
import Window from './components/Window'; // Eksik olan buydu!
import BootScreen from './components/BootScreen';
import './App.css';
import shutdownSound from './assets/windows98shutdown.mp3';

function App() {
  const [isBooting, setIsBooting] = useState(true); // Boot state
  const [isShuttingDown, setIsShuttingDown] = useState(false); // Shutdown state
  const [openWindows, setOpenWindows] = useState([]);
  const [focusedWindowId, setFocusedWindowId] = useState(null);
  const [zIndexCounter, setZIndexCounter] = useState(1000); // Yüksek değerle başlattık
  const [isStartOpen, setIsStartOpen] = useState(false);
  const { volume } = useOS(); // Use Global Volume from Context

  /* REMOVED: Local Volume State & Persistence (Moved to OSContext) */

  const toggleStart = () => setIsStartOpen(!isStartOpen);

  const handleBootComplete = () => {
    setIsBooting(false);
  };

  const handleWindowFocus = (id) => {
    setFocusedWindowId(id);
    const newZ = zIndexCounter + 1;
    setZIndexCounter(newZ);
    setOpenWindows((prev) =>
      prev.map((win) =>
        win.id === id ? { ...win, zIndex: newZ, isMinimized: false } : win
      )
    );
  };

  const handleIconClick = (title, content, options = {}) => {
    // Aynı pencereden birden fazla açılmasın diye kontrol
    const id = title.toLowerCase().replace(/\s/g, '');
    const existing = openWindows.find(w => w.id === id);

    if (existing) {
      handleWindowFocus(id);
      return;
    }

    const newZ = zIndexCounter + 1;
    setZIndexCounter(newZ);
    setFocusedWindowId(id);

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

  const closeWindow = (id) => {
    setOpenWindows((prev) => prev.filter((win) => win.id !== id));
    if (focusedWindowId === id) setFocusedWindowId(null);
  };

  const handleShutdown = (type) => {
    // 1. Audio Fix (User requested specific log)
    const audio = new Audio(shutdownSound);
    audio.volume = volume; // Apply global volume
    audio.play().catch(e => console.log('Ses çalınamadı, devam ediliyor...'));

    // 2. Visual Shutdown
    setIsShuttingDown(true);

    // 3. The Final Reload
    setTimeout(() => {
      window.location.reload();
    }, 5000);
  };

  return (
    <div className="app-root" style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
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
            isStartOpen={isStartOpen}
            toggleStart={toggleStart}
            onShutdown={handleShutdown}
          />

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
              <img src="/src/assets/images/windows.png" alt="Logo" style={{ width: '100px', marginBottom: '20px' }} />
              <h2 style={{ fontSize: '24px' }}>Windows is shutting down...</h2>
            </div>
          )}

          {/* PENCERELERİ EKRANDA ÇİZEN KRİTİK DÖNGÜ */}

        </>
      )}
    </div>
  );
}

export default App;
