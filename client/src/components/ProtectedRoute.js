import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Spinner } from 'react-bootstrap';

const ProtectedRoute = () => {
    const { isAuthenticated, loading } = useAuth();

    // Add console log for debugging
    console.log(`ProtectedRoute: loading=${loading}, isAuthenticated=${isAuthenticated}`);

    if (loading) {
        // Show a spinner while authentication status is loading
        return (
          <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        );
    }

    // If authenticated, render the child route element
    // If not authenticated, redirect to the login page
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
    // <Outlet /> renders the matched child route element
    // replace prop avoids adding the redirected route to history
};

export default ProtectedRoute; 