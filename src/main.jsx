import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { OSProvider } from './context/OSContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <OSProvider>
      <App />
    </OSProvider>
  </StrictMode>,
)
