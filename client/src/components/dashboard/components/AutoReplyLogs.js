import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axiosInstance';
import './AutoReplyLogs.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faBrain, 
  faQuestionCircle, 
  faSpinner, 
  faSearch,
  faSync,
  faCalendarAlt,
  faFilter
} from '@fortawesome/free-solid-svg-icons';

function AutoReplyLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    dateFrom: getDefaultDateFrom(),
    dateTo: formatDate(new Date()),
    platform: 'all',
    matchType: 'all',
    searchTerm: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0
  });

  function getDefaultDateFrom() {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return formatDate(date);
  }

  function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/auto-reply/logs', {
        params: {
          page: pagination.page,
          limit: 10,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          platform: filters.platform !== 'all' ? filters.platform : undefined,
          matchType: filters.matchType !== 'all' ? filters.matchType : undefined,
          search: filters.searchTerm || undefined
        }
      });

      setLogs(response.data.logs);
      setPagination({
        page: response.data.page,
        totalPages: response.data.totalPages,
        totalItems: response.data.totalItems
      });
    } catch (err) {
      console.error('Error fetching auto-reply logs:', err);
      setError('Failed to load logs. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.platform, filters.matchType, filters.searchTerm, pagination.page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters({
      ...filters,
      [key]: value
    });
    // Reset to first page when filters change
    if (key !== 'searchTerm') {
      setPagination({
        ...pagination,
        page: 1
      });
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination({
      ...pagination,
      page: 1
    });
    fetchLogs();
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderMatchTypeIcon = (matchType) => {
    switch(matchType) {
      case 'direct':
        return <FontAwesomeIcon icon={faCheckCircle} className="match-direct" title="Direct Match" />;
      case 'intent':
        return <FontAwesomeIcon icon={faBrain} className="match-intent" title="Intent Match" />;
      case 'fallback':
        return <FontAwesomeIcon icon={faQuestionCircle} className="match-fallback" title="Fallback" />;
      default:
        return null;
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination({
      ...pagination,
      page
    });
  };

  return (
    <div className="auto-reply-logs">
      <div className="logs-header">
        <h3>Auto Reply Logs</h3>
        <button onClick={fetchLogs} className="refresh-button">
          <FontAwesomeIcon icon={faSync} /> Refresh
        </button>
      </div>

      <div className="logs-filters">
        <form onSubmit={handleSearch}>
          <div className="filters-row">
            <div className="filter-group">
              <label>
                <FontAwesomeIcon icon={faCalendarAlt} /> From
              </label>
              <input 
                type="date" 
                value={filters.dateFrom} 
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>
                <FontAwesomeIcon icon={faCalendarAlt} /> To
              </label>
              <input 
                type="date" 
                value={filters.dateTo} 
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>
                <FontAwesomeIcon icon={faFilter} /> Platform
              </label>
              <select 
                value={filters.platform} 
                onChange={(e) => handleFilterChange('platform', e.target.value)}
              >
                <option value="all">All Platforms</option>
                <option value="web">Website</option>
                <option value="mobile">Mobile App</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="messenger">Messenger</option>
                <option value="telegram">Telegram</option>
                <option value="email">Email</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <FontAwesomeIcon icon={faFilter} /> Match Type
              </label>
              <select 
                value={filters.matchType} 
                onChange={(e) => handleFilterChange('matchType', e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="direct">Direct Match</option>
                <option value="intent">Intent Match</option>
                <option value="fallback">Fallback</option>
              </select>
            </div>
          </div>

          <div className="search-bar">
            <input
              type="text"
              placeholder="Search messages..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            />
            <button type="submit">
              <FontAwesomeIcon icon={faSearch} /> Search
            </button>
          </div>
        </form>
      </div>

      {error && <div className="logs-error">{error}</div>}
      
      <div className="logs-table-container">
        {loading ? (
          <div className="logs-loading">
            <FontAwesomeIcon icon={faSpinner} spin />
            <p>Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="no-logs-message">
            <p>No logs found for the selected filters.</p>
          </div>
        ) : (
          <>
            <table className="logs-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Platform</th>
                  <th>User</th>
                  <th>Message</th>
                  <th>Response</th>
                  <th>Match</th>
                  <th>Confidence</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="timestamp-cell">{formatTimestamp(log.timestamp)}</td>
                    <td className="platform-cell">
                      <span className={`platform-badge platform-${log.platform}`}>
                        {log.platform}
                      </span>
                    </td>
                    <td className="user-cell">
                      {log.sender?.name || log.sender?.id || 'Anonymous'}
                    </td>
                    <td className="message-cell">{log.text}</td>
                    <td className="response-cell">{log.response?.text}</td>
                    <td className="match-cell">
                      <span className={`match-badge match-${log.response?.matchType}`}>
                        {renderMatchTypeIcon(log.response?.matchType)}
                        <span className="match-type-text">
                          {log.response?.matchType?.charAt(0).toUpperCase() + log.response?.matchType?.slice(1) || 'None'}
                        </span>
                      </span>
                    </td>
                    <td className="confidence-cell">
                      {log.response?.confidence ? 
                        `${(log.response.confidence * 100).toFixed(1)}%` : 
                        'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button 
                onClick={() => goToPage(1)} 
                disabled={pagination.page === 1}
                className="pagination-button"
              >
                First
              </button>
              <button 
                onClick={() => goToPage(pagination.page - 1)} 
                disabled={pagination.page === 1}
                className="pagination-button"
              >
                Previous
              </button>
              
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages || 1}
                {pagination.totalItems > 0 && ` (${pagination.totalItems} total logs)`}
              </span>
              
              <button 
                onClick={() => goToPage(pagination.page + 1)} 
                disabled={pagination.page === pagination.totalPages}
                className="pagination-button"
              >
                Next
              </button>
              <button 
                onClick={() => goToPage(pagination.totalPages)} 
                disabled={pagination.page === pagination.totalPages}
                className="pagination-button"
              >
                Last
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AutoReplyLogs; 