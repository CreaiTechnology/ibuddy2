import React from 'react';
import PropTypes from 'prop-types';
import './PlatformCard.css'; // We'll create this CSS file
// Import specific icons from react-icons
import { FaShoppingCart, FaWhatsapp, FaFacebookMessenger } from 'react-icons/fa'; // Use generic cart for Shopee/Lazada now
// import { SiShopee, SiLazada } from 'react-icons/si'; // Removed - Icons might not be available/exported

// Removed react-loader-spinner import
// import { Oval } from 'react-loader-spinner'; 

// Updated function to return icon components
const getPlatformIcon = (platformName) => {
  const iconSize = '2.5em'; // Control icon size here
  const lowerCaseName = platformName.toLowerCase();

  switch (lowerCaseName) {
    case 'shopee':
    case 'lazada': 
      return <FaShoppingCart size={iconSize} style={{ color: '#6c757d' }} />; // Use generic cart icon
    case 'whatsapp': 
      return <FaWhatsapp size={iconSize} style={{ color: '#25D366' }} />;
    case 'messenger': 
      return <FaFacebookMessenger size={iconSize} style={{ color: '#0084FF' }} />;
    default: 
      return '⚙️'; // Default icon
  }
};

function PlatformCard({ platformName, isConnected, onConnect, onDisconnect, isConnecting }) {
  return (
    <div className={`platform-card ${isConnected ? 'connected' : 'disconnected'}`}>
      <div className="platform-card-header">
        {/* Render the icon component */} 
        <div className="platform-icon-wrapper">{getPlatformIcon(platformName)}</div>
        <h5 className="platform-name">{platformName}</h5>
      </div>
      <div className="platform-card-status">
        Status: <span className={`status-text ${isConnected ? 'connected' : 'disconnected'}`}>{isConnected ? 'Connected' : 'Not Connected'}</span>
      </div>
      <div className="platform-card-actions">
        {/* Show simple text when connecting */} 
        {isConnecting ? (
            <div className="processing-text-container">
                <span>Processing...</span> 
            </div>
        ) : isConnected ? (
          <button onClick={onDisconnect} className="btn btn-danger btn-sm" disabled={isConnecting}>
            Disconnect
          </button>
        ) : (
          <button onClick={onConnect} className="btn btn-primary btn-sm" disabled={isConnecting}>
            Connect
          </button>
        )}
      </div>
    </div>
  );
}

PlatformCard.propTypes = {
  platformName: PropTypes.string.isRequired,
  isConnected: PropTypes.bool.isRequired,
  onConnect: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
  isConnecting: PropTypes.bool, // Added prop type
};

PlatformCard.defaultProps = {
  isConnecting: false, // Default value
};

export default PlatformCard; 