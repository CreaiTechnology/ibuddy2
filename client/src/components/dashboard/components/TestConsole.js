import React, { useState } from 'react';
import api from '../../../api/axiosInstance';
import './TestConsole.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCheckCircle, 
  faBrain, 
  faQuestionCircle, 
  faSpinner, 
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

function TestConsole() {
  const [inputMessage, setInputMessage] = useState('');
  const [platform, setPlatform] = useState('web');
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userContextProps, setUserContextProps] = useState({
    userId: 'test-user-123',
    userName: 'Test User',
    userType: 'customer',
    language: 'en',
    previousInteractions: 0
  });

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  const handleContextPropChange = (prop, value) => {
    setUserContextProps({
      ...userContextProps,
      [prop]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) {
      setError('Please enter a message to test');
      return;
    }

    setLoading(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await api.post('/api/auto-reply/process-message', {
        message: {
          text: inputMessage,
          platform,
          sender: {
            id: userContextProps.userId,
            name: userContextProps.userName,
            type: userContextProps.userType
          },
          timestamp: new Date().toISOString(),
          metadata: {
            language: userContextProps.language,
            previousInteractions: parseInt(userContextProps.previousInteractions, 10) || 0
          }
        }
      });

      setTestResult(response.data);
    } catch (err) {
      console.error('Error testing message:', err);
      setError('Failed to process test message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderMatchDetails = () => {
    if (!testResult) return null;

    return (
      <div className="match-details">
        <h4>Match Details</h4>
        {testResult.ruleId && (
          <div className="match-detail-item">
            <span className="detail-label">Rule ID:</span>
            <span className="detail-value">{testResult.ruleId}</span>
          </div>
        )}
        
        {testResult.intentId && (
          <div className="match-detail-item">
            <span className="detail-label">Intent ID:</span>
            <span className="detail-value">{testResult.intentId}</span>
          </div>
        )}
        
        <div className="match-detail-item">
          <span className="detail-label">Match Type:</span>
          <span className="detail-value match-type">
            {testResult.matchType === 'direct' && (
              <><FontAwesomeIcon icon={faCheckCircle} className="match-direct" /> Direct</>
            )}
            {testResult.matchType === 'intent' && (
              <><FontAwesomeIcon icon={faBrain} className="match-intent" /> Intent</>
            )}
            {testResult.matchType === 'fallback' && (
              <><FontAwesomeIcon icon={faQuestionCircle} className="match-fallback" /> Fallback</>
            )}
            {!testResult.matchType && 'None'}
          </span>
        </div>
        
        {testResult.confidence && (
          <div className="match-detail-item">
            <span className="detail-label">Confidence:</span>
            <span className="detail-value">{(testResult.confidence * 100).toFixed(1)}%</span>
          </div>
        )}
        
        {testResult.processingTime && (
          <div className="match-detail-item">
            <span className="detail-label">Processing Time:</span>
            <span className="detail-value">{testResult.processingTime}ms</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="test-console">
      <div className="test-console-header">
        <h3>Auto Reply Test Console</h3>
        <p>Test your auto-reply rules with different message inputs and contexts</p>
      </div>

      {error && (
        <div className="error-message">
          <FontAwesomeIcon icon={faInfoCircle} /> {error}
        </div>
      )}

      <div className="test-console-container">
        <div className="test-input-panel">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="testMessage">Test Message</label>
              <textarea
                id="testMessage"
                value={inputMessage}
                onChange={handleInputChange}
                placeholder="Enter a message to test auto-reply rules..."
                rows={4}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="platform">Platform</label>
                <select
                  id="platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="web">Website</option>
                  <option value="mobile">Mobile App</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="messenger">Messenger</option>
                  <option value="telegram">Telegram</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="language">Language</label>
                <select
                  id="language"
                  value={userContextProps.language}
                  onChange={(e) => handleContextPropChange('language', e.target.value)}
                >
                  <option value="en">English</option>
                  <option value="zh">Chinese</option>
                  <option value="ms">Malay</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="userType">User Type</label>
                <select
                  id="userType"
                  value={userContextProps.userType}
                  onChange={(e) => handleContextPropChange('userType', e.target.value)}
                >
                  <option value="customer">Customer</option>
                  <option value="prospect">Prospect</option>
                  <option value="agent">Agent</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="previousInteractions">Previous Interactions</label>
                <input
                  type="number"
                  id="previousInteractions"
                  value={userContextProps.previousInteractions}
                  onChange={(e) => handleContextPropChange('previousInteractions', e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <button type="submit" className="test-button" disabled={loading}>
              {loading ? (
                <><FontAwesomeIcon icon={faSpinner} spin /> Processing...</>
              ) : (
                'Test Message'
              )}
            </button>
          </form>
        </div>

        <div className="test-result-panel">
          <h4>Test Result</h4>
          
          {loading && (
            <div className="loading-indicator">
              Processing your message...
            </div>
          )}
          
          {!loading && !testResult && !error && (
            <div className="no-result-message">
              Submit a test message to see the reply here
            </div>
          )}
          
          {testResult && (
            <div className="result-container">
              <div className="response-preview">
                <div className="response-header">Auto Reply:</div>
                <div className="response-text">{testResult.text}</div>
              </div>
              
              {renderMatchDetails()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestConsole; 