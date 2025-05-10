import React from 'react';
// import { useEffect } from 'react'; // Removed unused import
// import { useNavigate } from 'react-router-dom'; // Removed unused import
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/auth/LoginForm';
import Navbar from '../components/Navbar'; // Reuse Navbar or create a simpler one
import Footer from '../components/Footer'; // Reuse Footer or create a simpler one

function LoginPage() {
  // Removed unused isAuthenticated and navigate
  const { loading } = useAuth(); 
  // const navigate = useNavigate(); // Removed unused variable

  /* // Temporarily comment out this useEffect to rely solely on onAuthStateChange for post-login redirect
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log('User already authenticated, redirecting from Login page...');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);
  */

  // Still show loading while checking initial auth state or if login caused state change
  if (loading) {
    return <div>Loading...</div>;
  }

  // If user IS authenticated (e.g., state updated but redirect hasn't happened yet), 
  // maybe show loading or null instead of the form briefly?
  // For now, let's allow the form to render briefly if authenticated but not yet redirected.
  // if (isAuthenticated) { 
  //    return <div>Redirecting...</div>; // Or null
  // }

  return (
    <>
      <Navbar /> {/* Decide if you want the full Navbar on auth pages */}
      <div className="auth-page-container container"> 
        {/* Removed inline style, LoginForm now handles its own margin */}
        {/* Title is now inside LoginForm */}
        <LoginForm />
      </div>
      <Footer /> {/* Decide if you want the full Footer on auth pages */}
    </>
  );
}

export default LoginPage; 