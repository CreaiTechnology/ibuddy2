import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axiosInstance';

function RecentActivity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate mock data for demonstration
  const generateRandomMessage = useCallback(() => {
    const messages = [
      'Hello, can you help me?',
      'What are your business hours?',
      'I need information about shipping',
      'How can I track my order?',
      'Is there a discount code available?',
      'When will my order arrive?',
      'Do you have this product in stock?',
      'I have a problem with my account'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }, []);
  
  const generateRandomResponse = useCallback(() => {
    const responses = [
      'Hi there! Of course, I\'m here to help!',
      'Our business hours are Monday-Friday, 9AM-5PM.',
      'We offer standard and expedited shipping options. Standard shipping takes 3-5 business days.',
      'You can track your order in your account or using the tracking number we sent in your confirmation email.',
      'You can use WELCOME10 for 10% off your first purchase.',
      'Orders typically arrive within 3-5 business days.',
      'Let me check our inventory. Please provide the product name or code.',
      'I\'m sorry to hear that. Could you please provide more details about the issue?'
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }, []);

  const generateMockActivities = useCallback(() => {
    const platforms = ['web', 'mobile', 'whatsapp', 'messenger'];
    const results = ['matched', 'unmatched'];
    const now = new Date();
    
    return Array(8).fill(0).map((_, i) => {
      const timestamp = new Date(now);
      timestamp.setMinutes(now.getMinutes() - i * 15 - Math.floor(Math.random() * 10));
      
      return {
        id: `act-${i}`,
        type: 'message_processed',
        timestamp: timestamp.toISOString(),
        platform: platforms[Math.floor(Math.random() * platforms.length)],
        result: results[Math.floor(Math.random() * results.length)],
        messagePreview: generateRandomMessage(),
        responsePreview: results[0] === 'matched' ? generateRandomResponse() : null,
        ruleId: results[0] === 'matched' ? Math.floor(Math.random() * 10) + 1 : null
      };
    });
  }, [generateRandomMessage, generateRandomResponse]);

  const fetchRecentActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real implementation, this would call an API endpoint for recent activities
      const response = await api.get('/api/auto-reply/activities');
      setActivities(response.data || generateMockActivities());
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      // For demo purposes, use mock data when API fails
      setActivities(generateMockActivities());
    } finally {
      setLoading(false);
    }
  }, [generateMockActivities]);

  useEffect(() => {
    fetchRecentActivities();
  }, [fetchRecentActivities]);

  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('default', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return 'Unknown time';
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'web': return 'fa-globe';
      case 'mobile': return 'fa-mobile';
      case 'whatsapp': return 'fa-whatsapp';
      case 'messenger': return 'fa-facebook-messenger';
      default: return 'fa-comment';
    }
  };

  return (
    <div className="dashboard-card recent-activity-card">
      <div className="dashboard-card-header">
        <h3>Recent Activity</h3>
        <button className="refresh-button" onClick={fetchRecentActivities}>
          <i className="fa fa-refresh"></i>
        </button>
      </div>
      
      <div className="activity-list-container">
        {loading ? (
          <div className="loading-indicator">Loading activities...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : activities.length === 0 ? (
          <div className="no-activity-message">No recent activities found</div>
        ) : (
          <ul className="activity-list">
            {activities.map(activity => (
              <li key={activity.id} className="activity-item">
                <div className="activity-time">{formatTime(activity.timestamp)}</div>
                <div className={`activity-platform-icon ${activity.platform}`}>
                  <i className={`fa ${getPlatformIcon(activity.platform)}`}></i>
                </div>
                <div className="activity-content">
                  <div className="activity-message-preview">{activity.messagePreview}</div>
                  <div className={`activity-result ${activity.result}`}>
                    {activity.result === 'matched' ? (
                      <>
                        <i className="fa fa-check-circle"></i> Matched Rule #{activity.ruleId}
                      </>
                    ) : (
                      <>
                        <i className="fa fa-times-circle"></i> No Match
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="card-footer">
        <a href="/analytics/activities" className="view-all-link">
          View All Activities <i className="fa fa-arrow-right"></i>
        </a>
      </div>
    </div>
  );
}

export default RecentActivity; 