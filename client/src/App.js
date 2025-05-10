import React, { Suspense, lazy } from 'react';
import {
  Route, 
  Routes,
  Navigate
} from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { LoadingProvider } from './contexts/LoadingContext';
import { theme } from './config/theme.config';
import NotFoundPage from './pages/NotFoundPage';
import SettingsLandingPage from './pages/SettingsLandingPage';
import Navbar from './components/Navbar';

import './App.css';

// Import Pages
const HomePage = lazy(() => import('./pages/HomePage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage')); // Data center overview
const AutoReplyDashboard = lazy(() => import('./components/dashboard/AutoReplyDashboard'));
const AppointmentMapPage = lazy(() => import('./pages/AppointmentMapPage'));
const ContentAgentPage = lazy(() => import('./pages/ContentAgentPage'));
const BrandSettingsPage = lazy(() => import('./pages/BrandSettingsPage'));
// Layouts and pages for Data/Settings
const DataCenterLayout = lazy(() => import('./components/layouts/DataCenterLayout'));
const SettingsCenterLayout = lazy(() => import('./components/layouts/SettingsCenterLayout'));
// Settings pages (stubs)
const UpgradePage = lazy(() => import('./pages/UpgradePage.jsx'));
const AutoReplySettingsPage = lazy(() => import('./pages/AutoReplySettingsPage.jsx'));
const WalkinBookingSettingsPage = lazy(() => import('./pages/WalkinBookingSettingsPage.jsx'));
const OnsiteBookingSettingsPage = lazy(() => import('./pages/OnsiteBookingSettingsPage.jsx'));
const DashboardLandingPage = lazy(() => import('./pages/DashboardLandingPage'));
const AgentConfigPage = lazy(() => import('./pages/AgentConfigPage'));
const PlatformApiManagement = lazy(() => import('./pages/PlatformApiManagement'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const UserPlanPage = lazy(() => import('./pages/UserPlanPage')); // New plan page

// Import Components (if needed globally, like a header/footer outside specific pages)
// import Navbar from './components/Navbar';
// import Footer from './components/Footer';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <LoadingProvider>
        <ErrorBoundary>
          <Suspense fallback={<div>加载中...</div>}>
            <div className="AppContainer">
              <Navbar />
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<DashboardLandingPage />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard/configure/:agentId" element={<AgentConfigPage />} />
                  <Route path="/dashboard/platform-api" element={<PlatformApiManagement />} />
                  {/* Data Center */}
                  <Route path="/data" element={<DataCenterLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="agent-reply" element={<AutoReplyDashboard />} />
                    <Route path="walkin-booking" element={<AppointmentMapPage />} />
                    <Route path="onsite-booking" element={<AppointmentMapPage />} />
                    <Route path="content-generator" element={<ContentAgentPage />} />
                  </Route>
                  {/* Settings Center */}
                  <Route path="/settings" element={<SettingsCenterLayout />}>
                    <Route index element={<SettingsLandingPage />} />
                    <Route path="agent-reply" element={<AutoReplySettingsPage />} />
                    <Route path="walkin-booking" element={<WalkinBookingSettingsPage />} />
                    <Route path="onsite-booking" element={<OnsiteBookingSettingsPage />} />
                    <Route path="content-generator" element={<BrandSettingsPage />} />
                  </Route>
                  {/* Upgrade Prompt */}
                  <Route path="/upgrade" element={<UpgradePage />} />
                  {/* User Profile & Account */}
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/profile/password" element={<ChangePasswordPage />} />
                  <Route path="/subscription" element={<SubscriptionPage />} />
                  <Route path="/plans" element={<UserPlanPage />} />
                </Route>

                {/* Optional: Add a 404 Not Found route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              {/* <Footer /> */}
            </div>
          </Suspense>
        </ErrorBoundary>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
