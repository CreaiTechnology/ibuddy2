import React from 'react';
import RegisterForm from '../components/auth/RegisterForm';
import Navbar from '../components/Navbar'; 
import Footer from '../components/Footer';

function RegisterPage() {
  return (
    <>
      <Navbar />
      <div className="auth-page-container container">
        <RegisterForm />
      </div>
      <Footer />
    </>
  );
}

export default RegisterPage; 