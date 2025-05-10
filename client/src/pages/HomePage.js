import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import Testimonials from '../components/Testimonials';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

// This component now represents the main landing page content
function HomePage() {
  const { isAuthenticated } = useAuth();

  const fetchProfile = async () => {
    try {
      console.log('Attempting to fetch profile...');
      const response = await api.get('/profile');
      console.log('Profile Response:', response.data);
      alert('Successfully fetched profile: ' + JSON.stringify(response.data.user));
    } catch (error) {
      console.error('Error fetching profile:', error.response || error);
      alert('Failed to fetch profile. Check console.');
    }
  };

  return (
    <>
      <Navbar />
      <Hero />
      {isAuthenticated && (
        <div className="container" style={{ textAlign: 'center', padding: '20px 0' }}>
            <button onClick={fetchProfile} className="btn btn-secondary">
                Test Get Profile (Protected)
            </button>
        </div>
      )}
      <Features />
      <Testimonials />
      <CTA />
      <Footer />
    </>
  );
}

export default HomePage; 