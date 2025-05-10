import React from 'react';
import PropTypes from 'prop-types';
// CSS styles are now in DashboardPage.css, imported by the parent

// Let's add a simple toggle switch component (or style a checkbox)
// For now, just a basic checkbox to demonstrate functionality
const ToggleSwitch = ({ isActive, onToggle }) => {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={isActive} onChange={onToggle} />
      <span className="slider round"></span>
    </label>
  );
};

ToggleSwitch.propTypes = {
  isActive: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

function AgentCard({ name, description, status, onManage, onToggleStatus }) {

  // Determine the class for the status indicator
  const statusIndicatorClass = `status-indicator ${status}`;
  const isActive = status === 'active';

  return (
    // Removed inline style, using .agent-card class from CSS
    <div className="agent-card"> 
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ marginRight: '1rem' }}>{name}</h3>
        {/* Add the toggle switch */} 
        <ToggleSwitch isActive={isActive} onToggle={onToggleStatus} />
      </div>
      {/* Removed inline style, using CSS */}
      <p>{description}</p>
      {/* Added wrapper div with class for styling */}
      <div className="status-section">
        Status: 
        {/* Removed inline style, added dynamic className */}
        <span className={statusIndicatorClass}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      {/* Removed inline style, using CSS for button alignment */}
      <button onClick={onManage} className="btn btn-secondary">
        Manage
      </button>
    </div>
  );
}

// Removed inline styles for the card

AgentCard.propTypes = {
  name: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['active', 'inactive']).isRequired,
  onManage: PropTypes.func.isRequired,
  onToggleStatus: PropTypes.func.isRequired,
};

export default AgentCard; 