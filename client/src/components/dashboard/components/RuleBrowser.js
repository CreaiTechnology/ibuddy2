import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'react-bootstrap';
import api from '../../../api/axiosInstance';
import RuleFormModal from './RuleFormModal';

function RuleBrowser() {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [modalRule, setModalRule] = useState(null);
  const [rules, setRules] = useState([]);
  const [filteredRules, setFilteredRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'active', 'disabled'
    type: 'all',   // 'all', 'keyword', 'regex', 'intent'
    platform: 'all' // 'all', 'web', 'mobile', etc.
  });

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/auto-reply/rules');
      setRules(response.data || []);
      setFilteredRules(response.data || []);
    } catch (err) {
      console.error('Error fetching rules:', err);
      setError('Failed to load rules. Please try again later.');
      setRules([]);
      setFilteredRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const applyFilters = useCallback(() => {
    let result = [...rules];
    
    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(rule => 
        (rule.keyword && rule.keyword.toLowerCase().includes(term)) ||
        (rule.name && rule.name.toLowerCase().includes(term)) ||
        (rule.response && rule.response.toLowerCase().includes(term))
      );
    }
    
    // Apply status filter
    if (filters.status !== 'all') {
      const isActive = filters.status === 'active';
      result = result.filter(rule => rule.is_active === isActive);
    }
    
    // Apply type filter
    if (filters.type !== 'all') {
      if (filters.type === 'regex') {
        result = result.filter(rule => rule.is_regex);
      } else if (filters.type === 'intent') {
        result = result.filter(rule => rule.intent_id);
      } else {
        result = result.filter(rule => !rule.is_regex && !rule.intent_id);
      }
    }
    
    // Apply platform filter if applicable
    if (filters.platform !== 'all') {
      result = result.filter(rule => 
        !rule.platforms || 
        rule.platforms.includes(filters.platform)
      );
    }
    
    setFilteredRules(result);
    
    // Clear selected rule if it's no longer in filtered results
    if (selectedRule && !result.find(r => r.id === selectedRule.id)) {
      setSelectedRule(null);
    }
  }, [rules, searchTerm, filters, selectedRule]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };

  const handleSelectRule = (rule) => {
    setSelectedRule(rule);
  };

  const getMatchTypeLabel = (rule) => {
    if (rule.is_regex) return 'Regex';
    if (rule.intent_id) return 'Intent';
    
    switch (rule.match_type) {
      case 'exact': return 'Exact Match';
      case 'contains': return 'Contains';
      case 'starts_with': return 'Starts With';
      case 'ends_with': return 'Ends With';
      case 'fuzzy': return 'Fuzzy Match';
      default: return 'Unknown';
    }
  };

  const renderRuleDetails = () => {
    if (!selectedRule) return null;
    
    return (
      <div className="rule-details">
        <h4>{selectedRule.name || `Rule #${selectedRule.id}`}</h4>
        
        <div className="rule-status">
          <span className={`status-indicator ${selectedRule.is_active ? 'active' : 'inactive'}`}>
            {selectedRule.is_active ? 'Active' : 'Disabled'}
          </span>
        </div>
        
        <div className="rule-detail-section">
          <h5>Pattern</h5>
          <div className="pattern-display">
            <div className="pattern-label">{getMatchTypeLabel(selectedRule)}:</div>
            <div className="pattern-value">{selectedRule.keyword}</div>
          </div>
        </div>
        
        <div className="rule-detail-section">
          <h5>Response</h5>
          <div className="response-display">
            {selectedRule.response}
          </div>
        </div>
        
        {selectedRule.conditions && selectedRule.conditions.length > 0 && (
          <div className="rule-detail-section">
            <h5>Conditions</h5>
            <ul className="conditions-list">
              {selectedRule.conditions.map((condition, index) => (
                <li key={index} className="condition-item">
                  {condition.type}: {condition.description || JSON.stringify(condition.parameters)}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {selectedRule.stats && (
          <div className="rule-detail-section">
            <h5>Statistics</h5>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Matches:</span>
                <span className="stat-value">{selectedRule.stats.matches || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Today:</span>
                <span className="stat-value">{selectedRule.stats.today || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Last 7 days:</span>
                <span className="stat-value">{selectedRule.stats.week || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Last active:</span>
                <span className="stat-value">
                  {selectedRule.stats.lastActive ? new Date(selectedRule.stats.lastActive).toLocaleDateString() : 'Never'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const openCreateModal = () => {
    setModalMode('create'); setModalRule(null); setShowModal(true);
  };
  const openEditModal = (rule) => {
    setModalMode('edit'); setModalRule(rule); setShowModal(true);
  };
  const handleSaveRule = (savedRule) => {
    if (modalMode === 'create') {
      setRules(prev => [...prev, savedRule]);
      setFilteredRules(prev => [...prev, savedRule]);
    } else {
      setRules(prev => prev.map(r => r.id === savedRule.id ? savedRule : r));
      setFilteredRules(prev => prev.map(r => r.id === savedRule.id ? savedRule : r));
      if (selectedRule && selectedRule.id === savedRule.id) setSelectedRule(savedRule);
    }
  };
  const handleDeleteRule = (deletedRule) => {
    setRules(prev => prev.filter(r => r.id !== deletedRule.id));
    setFilteredRules(prev => prev.filter(r => r.id !== deletedRule.id));
    if (selectedRule && selectedRule.id === deletedRule.id) setSelectedRule(null);
  };

  return (
    <div className="rule-browser">
      <div className="rule-browser-header">
        <h3>Rule Browser</h3>
        <p>View and manage your auto-reply rules</p>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="rule-browser-toolbar">
        <Button variant="success" onClick={openCreateModal} className="me-3">New Rule</Button>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search rules..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-item">
            <label htmlFor="statusFilter">Status:</label>
            <select 
              id="statusFilter" 
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          
          <div className="filter-item">
            <label htmlFor="typeFilter">Type:</label>
            <select 
              id="typeFilter" 
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="all">All</option>
              <option value="keyword">Keyword</option>
              <option value="regex">Regex</option>
              <option value="intent">Intent</option>
            </select>
          </div>
          
          <div className="filter-item">
            <label htmlFor="platformFilter">Platform:</label>
            <select 
              id="platformFilter" 
              value={filters.platform}
              onChange={(e) => handleFilterChange('platform', e.target.value)}
            >
              <option value="all">All</option>
              <option value="web">Web</option>
              <option value="mobile">Mobile</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="messenger">Messenger</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="rule-browser-content">
        <div className="rules-list-panel">
          {loading ? (
            <div className="loading-indicator">Loading rules...</div>
          ) : (
            <>
              <div className="rules-count">
                Showing {filteredRules.length} of {rules.length} rules
              </div>
              
              {filteredRules.length === 0 ? (
                <div className="no-rules-message">
                  {searchTerm || filters.status !== 'all' || filters.type !== 'all' || filters.platform !== 'all' ? 
                    'No rules match your current filters.' :
                    'No rules have been defined yet.'
                  }
                </div>
              ) : (
                <ul className="rules-list">
                  {filteredRules.map(rule => (
                    <li 
                      key={rule.id} 
                      className={`rule-list-item ${selectedRule && selectedRule.id === rule.id ? 'selected' : ''}`}
                      onClick={() => handleSelectRule(rule)}
                      onDoubleClick={() => openEditModal(rule)}
                      title="Double-click to edit"
                    >
                      <div className="rule-list-item-header">
                        <span className="rule-name">{rule.name || `Rule #${rule.id}`}</span>
                        <span className={`rule-status-dot ${rule.is_active ? 'active' : 'inactive'}`}></span>
                      </div>
                      <div className="rule-pattern">{rule.keyword}</div>
                      <div className="rule-meta">
                        <span className="rule-type">{getMatchTypeLabel(rule)}</span>
                        {rule.stats && <span className="rule-triggers">{rule.stats.matches || 0} matches</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
        
        <div className="rule-details-panel">
          {loading ? (
            <div className="loading-indicator">Loading rule details...</div>
          ) : selectedRule ? (
            renderRuleDetails()
          ) : (
            <div className="no-selection-message">
              Select a rule from the list to view its details
            </div>
          )}
        </div>
      </div>

      {/* Modal for Create/Edit Rule */}
      <RuleFormModal
        show={showModal}
        mode={modalMode}
        ruleData={modalRule}
        onSave={handleSaveRule}
        onDelete={handleDeleteRule}
        onHide={() => setShowModal(false)}
      />
    </div>
  );
}

export default RuleBrowser; 