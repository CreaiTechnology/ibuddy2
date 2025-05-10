import React, { useState, useEffect } from 'react';
import './AutoReplyConfig.css';
import api from '../../api/axiosInstance';

function AutoReplyConfig() {
  const [rules, setRules] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/api/auto-reply/rules');
        setRules(response.data || []);
      } catch (err) {
        setError('Failed to load rules. Please try again later.');
        setRules([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  const resetForm = () => {
    setNewKeyword('');
    setNewResponse('');
    setEditingRuleId(null);
    setError(null);
  };

  const handleEditRuleStart = (rule) => {
    setEditingRuleId(rule.id);
    setNewKeyword(rule.keyword);
    setNewResponse(rule.response);
    setError(null);
    document.querySelector('.add-rule-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!newKeyword || !newResponse) {
      alert('Please fill in keyword and response.');
      return;
    }
    setLoading(true);
    setError(null);
    const ruleData = { keyword: newKeyword, response: newResponse };
    try {
      let updatedRuleData;
      if (editingRuleId !== null) {
        const response = await api.put(`/api/auto-reply/rules/${editingRuleId}`, ruleData);
        updatedRuleData = response.data;
        setRules(rules.map(rule => (rule.id === editingRuleId ? updatedRuleData : rule)));
      } else {
        const response = await api.post('/api/auto-reply/rules', ruleData);
        updatedRuleData = response.data;
        setRules([...rules, updatedRuleData]);
      }
      resetForm();
    } catch (err) {
      setError('Failed to save rule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRule = async (idToDelete) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }
    if (editingRuleId === idToDelete) {
      resetForm();
    }
    setLoading(true);
    setError(null);
    try {
      await api.delete(`/api/auto-reply/rules/${idToDelete}`);
      setRules(rules.filter(rule => rule.id !== idToDelete));
    } catch (err) {
      setError('Failed to delete rule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auto-reply-config">
      <h4>Keyword Auto-Reply Rules</h4>
      <p>Define keyword-triggered responses. These rules apply to all connected platforms automatically.</p>
      {loading && <p>Loading rules...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && (
        <div className="rules-list-container">
          <h5>Defined Rules</h5>
          {rules.length === 0 && !error ? (
            <p>No rules defined yet.</p>
          ) : (
            <ul className="rules-list">
              {rules.map(rule => (
                <li key={rule.id} className="rule-item">
                  <div className="rule-item-content">
                    <strong>Keyword:</strong> {rule.keyword}<br />
                    <strong>Response:</strong> {rule.response}
                  </div>
                  <div className="rule-item-actions">
                    <button onClick={() => handleEditRuleStart(rule)} className="btn btn-secondary btn-sm" disabled={loading}>Edit</button>
                    <button onClick={() => handleDeleteRule(rule.id)} className="btn btn-danger btn-sm" disabled={loading}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <form onSubmit={handleFormSubmit} className="add-rule-form">
        <h5>{editingRuleId !== null ? 'Edit Rule' : 'Add New Rule'}</h5>
        <div className="form-group">
          <label htmlFor="keyword">Keyword:</label>
          <input
            type="text"
            id="keyword"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="response">Response:</label>
          <textarea
            id="response"
            value={newResponse}
            onChange={(e) => setNewResponse(e.target.value)}
            required
            rows={3}
            disabled={loading}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {editingRuleId !== null ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingRuleId !== null && (
            <button type="button" className="btn btn-outline" onClick={resetForm} disabled={loading}>
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default AutoReplyConfig;