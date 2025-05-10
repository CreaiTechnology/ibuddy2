import React, { useState } from 'react';
import PropTypes from 'prop-types';

// Mock Chart Component - In a real app, use a library like Chart.js or recharts
const MockChart = ({ data, type }) => (
  <div className="mock-chart" style={{ height: '150px', background: '#f5f7fa', borderRadius: '4px', padding: '10px' }}>
    <div style={{ textAlign: 'center', paddingTop: '60px', color: '#888' }}>
      {type} Chart - {data.length} data points
    </div>
  </div>
);

function StatsOverview({ dailyTriggers, topRules }) {
  const [timeRange, setTimeRange] = useState('week');
  
  const getTimeRangeText = () => {
    switch(timeRange) {
      case 'day': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'Custom Range';
    }
  };
  
  return (
    <div className="dashboard-card stats-overview">
      <div className="dashboard-card-header">
        <h3>Usage Statistics</h3>
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
      
      <div className="chart-section">
        <h4>Trigger Frequency</h4>
        <MockChart data={dailyTriggers} type="Line" />
      </div>
      
      <div className="top-rules-section">
        <h4>Top Rules ({getTimeRangeText()})</h4>
        {topRules.length > 0 ? (
          <ul className="top-rules-list">
            {topRules.slice(0, 5).map((rule, index) => (
              <li key={rule.id || index} className="top-rule-item">
                <div className="top-rule-rank">{index + 1}</div>
                <div className="top-rule-info">
                  <div className="top-rule-name">{rule.name || `Rule #${rule.id}`}</div>
                  <div className="top-rule-keyword">{rule.keyword}</div>
                </div>
                <div className="top-rule-count">{rule.triggerCount} times</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="no-data-message">
            No rule trigger data available for {getTimeRangeText().toLowerCase()}.
          </div>
        )}
      </div>
      
      <div className="stats-footer">
        <a href="/analytics/auto-reply" className="view-all-link">
          View Detailed Analytics <i className="fa fa-arrow-right"></i>
        </a>
      </div>
    </div>
  );
}

StatsOverview.propTypes = {
  dailyTriggers: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      count: PropTypes.number
    })
  ).isRequired,
  topRules: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string,
      keyword: PropTypes.string,
      triggerCount: PropTypes.number
    })
  ).isRequired
};

StatsOverview.defaultProps = {
  dailyTriggers: [],
  topRules: []
};

export default StatsOverview; 