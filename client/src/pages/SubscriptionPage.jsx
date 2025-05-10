import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Container, Button } from 'react-bootstrap';

export default function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <Container style={{ padding: '2rem', maxWidth: '600px' }}>
      <h2>Subscription</h2>
      <p>
        Your current plan is: <strong>{user?.plan || 'free'}</strong>
      </p>
      <Button variant="primary" onClick={() => navigate('/upgrade')}>Upgrade Plan</Button>
    </Container>
  );
} 