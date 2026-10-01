import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { OSProvider } from './context/OSContext';
import { FileSystemProvider } from './context/FileSystemContext';
import { LanguageProvider } from './context/LanguageContext';
import { DisplayProvider } from './context/DisplayContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <OSProvider>
        <FileSystemProvider>
          <DisplayProvider>
            <App />
          </DisplayProvider>
        </FileSystemProvider>
      </OSProvider>
    </LanguageProvider>
  </StrictMode>,
)
