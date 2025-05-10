import React, { useState, useEffect } from 'react';
import { useFeatureGuard } from '../../hooks/useFeatureGuard';
import './AutoReplyDashboard.css';
import api from '../../api/axiosInstance';
import StatusCard from './components/StatusCard';
import StatsOverview from './components/StatsOverview';
import TestConsole from './components/TestConsole';
import RuleBrowser from './components/RuleBrowser';
import RecentActivity from './components/RecentActivity';
import PerformanceMetrics from './components/PerformanceMetrics';
import AutoReplyLogs from './components/AutoReplyLogs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTachometerAlt, 
  faVial, 
  faListAlt, 
  faHistory,
  faCog,
  faExclamationTriangle 
} from '@fortawesome/free-solid-svg-icons';

function AutoReplyDashboard() {
  useFeatureGuard('proA');
  const [stats, setStats] = useState({
    totalRules: 0,
    activeRules: 0,
    disabledRules: 0,
    lastUpdated: null,
    status: 'normal', // 'normal', 'warning', 'error', 'maintenance'
    dailyTriggers: [],
    topRules: [],
    unmatchedStats: { count: 0, examples: [] }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get dashboard statistics
      const response = await api.get('/api/auto-reply/stats');
      setStats(response.data || {
        totalRules: 0,
        activeRules: 0,
        disabledRules: 0,
        lastUpdated: new Date().toISOString(),
        status: 'normal',
        dailyTriggers: [],
        topRules: [],
        unmatchedStats: { count: 0, examples: [] }
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="dashboard-overview">
            <div className="dashboard-row">
              <StatusCard 
                totalRules={stats.totalRules}
                activeRules={stats.activeRules}
                disabledRules={stats.disabledRules}
                status={stats.status}
                lastUpdated={stats.lastUpdated}
                onRefresh={fetchDashboardData}
              />
              <StatsOverview 
                dailyTriggers={stats.dailyTriggers}
                topRules={stats.topRules}
              />
            </div>
            <div className="dashboard-row">
              <RecentActivity />
              <PerformanceMetrics />
            </div>
          </div>
        );
      case 'test':
        return <TestConsole />;
      case 'rules':
        return <RuleBrowser />;
      case 'logs':
        return <AutoReplyLogs />;
      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <div className="auto-reply-dashboard">
      <div className="dashboard-header">
        <h2>Auto Reply Control Center</h2>
        <div className="api-management-link">
          <a href="/platform/api-management" className="btn btn-outline-primary">
            <FontAwesomeIcon icon={faCog} /> Manage Settings in API Platform
          </a>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
        </div>
      )}

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FontAwesomeIcon icon={faTachometerAlt} /> Dashboard Overview
        </button>
        <button 
          className={`tab-button ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          <FontAwesomeIcon icon={faVial} /> Test Console
        </button>
        <button 
          className={`tab-button ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <FontAwesomeIcon icon={faListAlt} /> Rule Browser
        </button>
        <button 
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <FontAwesomeIcon icon={faHistory} /> Response Logs
        </button>
      </div>

      <div className="dashboard-content">
        {loading && activeTab === 'overview' ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
}

export default AutoReplyDashboard; 