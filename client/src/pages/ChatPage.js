import React from 'react';
import ChatInterface from '../components/chat/ChatInterface';
import Navbar from '../components/Navbar'; // Or a different Navbar for logged-in users
// import Footer from '../components/Footer'; // Removed unused import

function DashboardPage() {
  return (
    <>
      <Navbar />
      {/* Container for the dashboard content */}
      <div className="container dashboard-container" style={{ paddingTop: '80px', paddingBottom: '20px' }}>
         {/* Placeholder: Replace ChatInterface with actual Dashboard components later */}
        <h2>Dashboard</h2>
        <p>AI Agent Management Hub</p>
        {/* <ChatInterface /> */} {/* Temporarily commented out */}
      </div>
      {/* <Footer /> */}
    </>
  );
}

export default DashboardPage; 