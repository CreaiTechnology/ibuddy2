import React from 'react';
import ForgotPasswordForm from '../components/auth/ForgotPasswordForm';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './LoginPage.css'; // Reuse login page styles

function ForgotPasswordPage() {
  return (
    <>
      <Navbar />
      <div className="auth-page-container container">
        <ForgotPasswordForm />
      </div>
      <Footer />
    </>
  );
}

export default ForgotPasswordPage; 