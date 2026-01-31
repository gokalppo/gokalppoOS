import './StartMenu.css';
import documentsIcon from '../assets/images/documents.png';
import findIcon from '../assets/images/find.png';
import helpIcon from '../assets/images/help.png';
import keyIcon from '../assets/images/admin.png';
import OutlookExpress from './apps/OutlookExpress';


const StartMenu = ({ isOpen, onClose, onLaunch, onShutdown }) => {

  if (!isOpen) return null;

  /* DEBUG CHECK */
  console.log("OutlookExpress Import Check:", OutlookExpress);

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
