import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
// import ChatInterface from '../components/chat/ChatInterface'; // This component might need renaming/repurposing later
import Navbar from '../components/Navbar'; // Or a different Navbar for logged-in users
// import Footer from '../components/Footer'; // Removed unused import
import AgentCard from '../components/dashboard/AgentCard'; // Import the card component
import './DashboardPage.css'; // Import the CSS file
import { Card } from 'react-bootstrap';

// Initial mock data for AI Agents
const initialMockAgents = [
  {
    id: 'auto-reply',
    name: 'Auto-Reply Agent',
    description: 'Automatically respond to common inquiries on selected platforms.',
    status: 'inactive',
  },
  {
    id: 'walkin-booking',
    name: 'Walk-in Booking Agent',
    description: 'Manage walk-in appointments and update your calendar.',
    status: 'active',
  },
  {
    id: 'onsite-booking',
    name: 'On-site Booking Agent',
    description: 'Handle booking requests for services at customer locations.',
    status: 'inactive',
  },
  {
    id: 'content-creation',
    name: 'Content Creation & Posting Agent',
    description: 'Generate and schedule posts for your social media platforms.',
    status: 'inactive',
  },
];

function DashboardPage() {
  // Use state to manage agents data so UI updates on change
  const [agents, setAgents] = useState(initialMockAgents);
  const navigate = useNavigate(); // Initialize useNavigate

  // Updated function to navigate to the config page
  const handleManageAgent = (agentId) => {
    console.log(`Navigate to configure agent: ${agentId}`);
    navigate(`/dashboard/configure/${agentId}`); // Use navigate
  };

  // Function to handle toggling agent status
  const handleToggleAgentStatus = (agentId) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === agentId 
          ? { ...agent, status: agent.status === 'active' ? 'inactive' : 'active' } 
          : agent
      )
    );
    console.log(`Toggled status for agent: ${agentId}`);
    // In a real app, you would also make an API call here to update the backend
  };

  // 新增：平台API管理卡片点击跳转
  const handlePlatformApiManage = () => {
    navigate('/dashboard/platform-api');
  };

  return (
    <>
      <Navbar />
      {/* Container for the dashboard content */}
      <div className="container dashboard-container">
        <h2 className="dashboard-title">Data Center</h2>
        {/* Card Layout Container */}
        <div className="agent-cards-container"> 
          {/* Platform API Management Card */}
          <Card className="agent-card" style={{ cursor: 'pointer', border: '2px solid #007bff' }} onClick={handlePlatformApiManage}>
            <Card.Body>
              <h3 style={{ color: '#007bff' }}>Platform API Management</h3>
              <p>Manage authorization for all platform accounts.</p>
            </Card.Body>
          </Card>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              name={agent.name}
              description={agent.description}
              status={agent.status}
              onManage={() => handleManageAgent(agent.id)}
              onToggleStatus={() => handleToggleAgentStatus(agent.id)}
            />
          ))}
        </div>

        {/* Placeholder: Replace ChatInterface with actual Dashboard components later */}
        {/* <ChatInterface /> */} {/* Temporarily commented out */}
      </div>
      {/* <Footer /> */}
    </>
  );
}

// Removed inline styles for the container

export default DashboardPage; // Updated export 