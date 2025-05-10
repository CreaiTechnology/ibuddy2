/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axiosInstance';

// Mock Chart Component - In a real app, use a library like Chart.js or recharts
const GaugeChart = ({ value, maxValue, label, color }) => (
  <div className="gauge-chart">
    <div className="gauge-value" style={{ color }}>
      {value}<span className="gauge-unit">ms</span>
    </div>
    <div className="gauge-label">{label}</div>
    <div className="gauge-background">
      <div 
        className="gauge-fill" 
        style={{ 
          width: `${Math.min(100, (value / maxValue) * 100)}%`,
          backgroundColor: color
        }} 
      />
    </div>
  </div>
);

function PerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    avgResponseTime: 135,
    p95ResponseTime: 310,
    successRate: 99.7,
    errorRate: 0.3,
    apiCalls: {
      total: 2508,
      today: 283
    },
    aiCalls: {
      total: 985,
      today: 94
    }
  });
  const [timeRange, setTimeRange] = useState('day');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchPerformanceMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real implementation, this would call an API endpoint with the timeRange parameter
      const response = await api.get(`/auto-reply/metrics?timeRange=${timeRange}`);
      setMetrics(response.data || generateMockMetrics());
    } catch (err) {
      console.error('Error fetching performance metrics:', err);
      // For demo purposes, use mock data when API fails
      setMetrics(generateMockMetrics());
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchPerformanceMetrics();
  }, [timeRange]);

  // Generate mock data for demonstration
  const generateMockMetrics = () => {
    // Randomize values slightly based on timeRange
    const multiplier = timeRange === 'day' ? 1 : timeRange === 'week' ? 1.2 : 1.5;
    
    return {
      avgResponseTime: Math.round(120 + Math.random() * 30 * multiplier),
      p95ResponseTime: Math.round(280 + Math.random() * 60 * multiplier),
      successRate: (99.5 + Math.random() * 0.5).toFixed(1),
      errorRate: (0.1 + Math.random() * 0.4).toFixed(1),
      apiCalls: {
        total: Math.round(2000 + Math.random() * 1000 * multiplier),
        today: Math.round(200 + Math.random() * 100)
      },
      aiCalls: {
        total: Math.round(800 + Math.random() * 400 * multiplier),
        today: Math.round(50 + Math.random() * 50)
      }
    };
  };

  const getTimeRangeText = () => {
    switch(timeRange) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return '';
    }
  };

  const getResponseTimeColor = (time) => {
    if (time < 150) return '#4caf50'; // Green
    if (time < 300) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  return (
    <div className="dashboard-card performance-metrics-card">
      <div className="dashboard-card-header">
        <h3>Performance Metrics</h3>
        <div className="time-range-selector">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="time-range-select"
          >
            <option value="day">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-indicator">Loading metrics...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="metrics-container">
          <div className="response-time-section">
            <h4>Response Time ({getTimeRangeText()})</h4>
            <div className="gauge-charts">
              <GaugeChart 
                value={metrics.avgResponseTime} 
                maxValue={500}
                label="Average" 
                color={getResponseTimeColor(metrics.avgResponseTime)}
              />
              <GaugeChart 
                value={metrics.p95ResponseTime} 
                maxValue={500}
                label="95th Percentile" 
                color={getResponseTimeColor(metrics.p95ResponseTime)}
              />
            </div>
          </div>
          
          <div className="success-rate-section">
            <div className="rate-stat success-rate">
              <span className="rate-value">{metrics.successRate}%</span>
              <span className="rate-label">Success Rate</span>
            </div>
            <div className="rate-stat error-rate">
              <span className="rate-value">{metrics.errorRate}%</span>
              <span className="rate-label">Error Rate</span>
            </div>
          </div>
          
          <div className="api-usage-section">
            <h4>API Usage</h4>
            <div className="usage-stats">
              <div className="usage-stat">
                <div className="usage-label">Total API Calls:</div>
                <div className="usage-value">{metrics.apiCalls.total.toLocaleString()}</div>
              </div>
              <div className="usage-stat">
                <div className="usage-label">Today's API Calls:</div>
                <div className="usage-value">{metrics.apiCalls.today.toLocaleString()}</div>
              </div>
              <div className="usage-stat">
                <div className="usage-label">Total AI Calls:</div>
                <div className="usage-value">{metrics.aiCalls.total.toLocaleString()}</div>
              </div>
              <div className="usage-stat">
                <div className="usage-label">Today's AI Calls:</div>
                <div className="usage-value">{metrics.aiCalls.today.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="card-footer">
        <a href="/analytics/performance" className="view-all-link">
          View Detailed Performance <i className="fa fa-arrow-right"></i>
        </a>
      </div>
    </div>
  );
}

export default PerformanceMetrics; 