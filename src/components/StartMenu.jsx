import { lazy } from 'react';
import './StartMenu.css';
import documentsIcon from '../assets/images/documents.png';
import helpIcon from '../assets/images/help.png';
import computerIcon from '../assets/images/This_PC_1995.svg';

// Pulls in @emailjs/browser + Firebase — split into its own chunk so it's
// only fetched if the user actually opens "New Message".
const OutlookExpress = lazy(() => import('./apps/OutlookExpress'));
const SystemProperties = lazy(() => import('./apps/SystemProperties'));

const StartMenu = ({ isOpen, onClose, onLaunch, onShutdown }) => {

  if (!isOpen) return null;

  const handleLaunch = (title, content, options = {}) => {
    // onLaunch is mapped to handleIconClick from App.jsx -> Desktop -> Taskbar -> StartMenu
    if (onLaunch) {
      onLaunch(title, content, options);
    }
    if (onClose) onClose();
  };

  return (
    <div className="start-menu">
      <div className="start-side-bar">
        <span className="os-version">gokalppoOS</span>
      </div>
      <div className="start-content">
        <div className="start-item" onClick={() => handleLaunch("System Properties", <SystemProperties />, {
          width: '430px', height: '470px', minWidth: '430px', minHeight: '470px', resizable: false,
          bodyStyle: { padding: 0 }, icon: <img src={computerIcon} alt="System Properties" />
        })}>
          <span className="icon"><img src={computerIcon} alt="" style={{ width: '24px' }} /></span>
          <span className="label">System Properties</span>
        </div>
        <div className="start-item" onClick={() => handleLaunch("Documents", <div>My Documents folder...</div>)}>
          <span className="icon"><img src={documentsIcon} alt="" style={{ width: '24px' }} /></span>
          <span className="label">Documents</span>
          <span className="arrow">▶</span>
        </div>
        <div className="start-item" onClick={() => handleLaunch("New Message", <OutlookExpress />, { width: '500px', height: '400px', icon: <img src={helpIcon} alt="Help" /> })}>
          <span className="icon"><img src={helpIcon} alt="" style={{ width: '24px' }} /></span>
          <span className="label">Help</span>
        </div>
        <div className="divider"></div>
        <div className="start-item" onClick={() => onShutdown && onShutdown('shutdown')}>
          <span className="icon">🛑</span>
          <span className="label">Shut Down...</span>
        </div>
      </div>
    </div>
  );
};

export default StartMenu;
