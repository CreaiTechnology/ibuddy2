import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Image } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle } from '@fortawesome/free-solid-svg-icons';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const toggleIcon = user?.avatarUrl
    ? <Image src={user.avatarUrl} roundedCircle width={32} height={32} />
    : <FontAwesomeIcon icon={faUserCircle} size="2x" style={{ color: '#fff' }} />;

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant="light"
        id="dropdown-user-menu"
        className="d-flex align-items-center p-0 border-0 bg-transparent"
      >
        {toggleIcon}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item onClick={() => navigate('/profile')}>My Profile</Dropdown.Item>
        {user?.identities?.some(id => id.provider === 'email') && (
          <Dropdown.Item onClick={() => navigate('/profile/password')}>
            Change Password
          </Dropdown.Item>
        )}
        <Dropdown.Item onClick={() => navigate('/subscription')}>Subscription{user.plan}</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item onClick={logout}>Logout</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
} 