import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Image, Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';

export default function ProfilePage() {
  const { user } = useAuth();
  const avatarElement = user?.avatarUrl
    ? <Image src={user.avatarUrl} roundedCircle width={100} height={100} className="me-3" />
    : <FontAwesomeIcon icon={faUserCircle} style={{ fontSize: '100px', color: '#fff' }} className="me-3" />;

  return (
    <Container className="py-4">
      <h2>My Profile</h2>
      <div className="d-flex align-items-center mb-4">
        {avatarElement}
        <div>
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Subscription:</strong> {user?.plan || 'free'}</p>
        </div>
      </div>
    </Container>
  );
} 