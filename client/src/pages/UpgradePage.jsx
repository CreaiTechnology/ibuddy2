import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

const Container = styled.div`
  padding: 2rem;
  text-align: center;
  color: ${props => props.theme.colors.text};
`;
const Button = styled.button`
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.textLight};
  border: none;
  border-radius: ${props => props.theme.radii.base};
  cursor: pointer;
  &:hover { background: ${props => props.theme.colors.secondary}; }
`;

export default function UpgradePage() {
  document.title = 'Upgrade Subscription';
  const navigate = useNavigate();
  return (
    <Container>
      <h1>Insufficient Permissions</h1>
      <p>Your current subscription level does not grant access to this feature. Please upgrade to unlock more features.</p>
      <Button onClick={() => navigate('/plans')}>
        View Subscription Plans
      </Button>
    </Container>
  );
} 