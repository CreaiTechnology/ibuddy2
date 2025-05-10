import React from 'react';
import PropTypes from 'prop-types';

function StatusCard({ totalRules, activeRules, disabledRules, status, lastUpdated, onRefresh }) {
  // Format the last updated time
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('default', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get status badge class and text
  const getStatusInfo = (status) => {
    switch (status) {
      case 'normal':
        return { class: 'status-normal', text: 'System Normal' };
      case 'warning':
        return { class: 'status-warning', text: 'Performance Issues' };
      case 'error':
        return { class: 'status-error', text: 'System Error' };
      case 'maintenance':
        return { class: 'status-maintenance', text: 'Maintenance Mode' };
      default:
        return { class: 'status-unknown', text: 'Status Unknown' };
    }
  };

  const statusInfo = getStatusInfo(status);

  return (
    <div className="dashboard-card status-card">
      <div className="dashboard-card-header">
        <h3>System Status</h3>
        <button 
          onClick={onRefresh} 
          className="refresh-button"
          aria-label="Refresh status"
        >
          <i className="fa fa-refresh"></i>
        </button>
      </div>
      
      <div className="status-badge-container">
        <span className={`status-badge ${statusInfo.class}`}>
          <i className="fa fa-circle"></i> {statusInfo.text}
        </span>
      </div>
      
      <div className="rules-count-container">
        <div className="rule-stat">
          <span className="rule-count">{totalRules}</span>
          <span className="rule-label">Total Rules</span>
        </div>
        <div className="rule-stat">
          <span className="rule-count">{activeRules}</span>
          <span className="rule-label">Active Rules</span>
        </div>
        <div className="rule-stat">
          <span className="rule-count">{disabledRules}</span>
          <span className="rule-label">Disabled Rules</span>
        </div>
      </div>
      
      <div className="last-updated">
        <span className="last-updated-label">Last Updated:</span>
        <span className="last-updated-time">{formatDate(lastUpdated)}</span>
      </div>
      
      <div className="status-footer">
        <a href="/platform/api-management" className="settings-link">
          <i className="fa fa-cog"></i> Manage Rules in API Platform
        </a>
      </div>
    </div>
  );
}

StatusCard.propTypes = {
  totalRules: PropTypes.number.isRequired,
  activeRules: PropTypes.number.isRequired,
  disabledRules: PropTypes.number.isRequired,
  status: PropTypes.oneOf(['normal', 'warning', 'error', 'maintenance', 'unknown']).isRequired,
  lastUpdated: PropTypes.string,
  onRefresh: PropTypes.func.isRequired
};

StatusCard.defaultProps = {
  totalRules: 0,
  activeRules: 0,
  disabledRules: 0,
  status: 'unknown',
  lastUpdated: null
};

export default StatusCard; 