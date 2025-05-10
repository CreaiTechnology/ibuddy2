import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import ErrorBoundary from './components/common/ErrorBoundary';

// Import Pages
import HomePage from './pages/HomePage'; 
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import PlatformSetupPage from './pages/PlatformSetupPage';
import NotFoundPage from './pages/NotFoundPage'; // Assuming you have a 404 page
import ContentAgentPage from './pages/ContentAgentPage'; // <-- Import the new page
import BrandSettingsPage from './pages/BrandSettingsPage'; // <-- Import Brand Settings page (even if not built yet)

// Import Platform Management Module
import { PlatformManagement } from '../../src/modules';


// Placeholder for authentication logic
// In a real app, this would check tokens, context, etc.
const isAuthenticated = () => {
  // TODO: Replace with actual authentication check (e.g., check for token in localStorage)
  // For now, let's assume the user is authenticated if they visit any protected route directly,
  // but ideally, you'd have a global state (like Context API or Redux).
  return localStorage.getItem('authToken') !== null; // Example check
};

// Simple Protected Route component
const ProtectedRoute = ({ children }) => {
  if (!isAuthenticated()) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected.
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Navbar />
        <Container fluid className="pt-4 pb-4">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route 
              path="/platforms" 
              element={
                <ProtectedRoute>
                  <PlatformSetupPage />
                </ProtectedRoute>
              }
            />
             <Route 
              path="/content-agent" // <-- Add route for Content Agent
              element={
                <ProtectedRoute>
                  <ContentAgentPage />
                </ProtectedRoute>
              }
            />
             <Route 
              path="/brand-settings" // <-- Add route for Brand Settings
              element={
                <ProtectedRoute>
                  <BrandSettingsPage />
                </ProtectedRoute>
              }
            />
            
            {/* Platform Management Module Routes */}
            <Route 
              path="/platform-management/*" 
              element={
                <ProtectedRoute>
                  <PlatformManagement />
                </ProtectedRoute>
              }
            />

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Container>
        <ToastContainer 
          position="bottom-right" 
          autoClose={3000} 
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </ErrorBoundary>
    </Router>
  );
}

export default App; 