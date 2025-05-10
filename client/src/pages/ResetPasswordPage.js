import React from 'react';
import ResetPasswordForm from '../components/auth/ResetPasswordForm';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './LoginPage.css'; // Reuse login page styles

function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <div className="auth-page-container container">
        <ResetPasswordForm />
      </div>
      <Footer />
    </>
  );
}

export default ResetPasswordPage; 