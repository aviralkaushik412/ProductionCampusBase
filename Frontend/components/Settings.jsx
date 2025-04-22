import { FaArrowLeft, FaBell, FaLock, FaShieldAlt, FaPalette, FaImage, FaInfoCircle, FaKeyboard } from 'react-icons/fa';
import './styles/Settings.css';

function Settings({ onClose, username, role }) {
  return (
    <div className="settings-container">
      <div className="settings-header">
        <button className="back-button" onClick={onClose}>
          <FaArrowLeft />
        </button>
        <h2>Settings</h2>
      </div>

      <div className="user-profile">
        <div className="avatar">
          {username ? username[0].toUpperCase() : 'U'}
        </div>
        <div className="user-info">
          <h3>{username}</h3>
          <p>{role}</p>
        </div>
      </div>

      <div className="settings-options">
        <button className="settings-option">
          <FaBell />
          <span>Notifications</span>
        </button>

        <button className="settings-option">
          <FaLock />
          <span>Privacy</span>
        </button>

        <button className="settings-option">
          <FaShieldAlt />
          <span>Security</span>
        </button>

        <button className="settings-option">
          <FaPalette />
          <span>Theme</span>
        </button>

        <button className="settings-option">
          <FaImage />
          <span>Chat Wallpaper</span>
        </button>

        <button className="settings-option">
          <FaInfoCircle />
          <span>Request Account Info</span>
        </button>

        <button className="settings-option">
          <FaKeyboard />
          <span>Keyboard Shortcuts</span>
        </button>
      </div>
    </div>
  );
}

export default Settings; 