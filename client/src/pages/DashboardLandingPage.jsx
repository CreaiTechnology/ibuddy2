import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Container, Row, Col } from 'react-bootstrap';

function DashboardLandingPage() {
  const navigate = useNavigate();

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Dashboard</h2>
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Data Center</Card.Title>
              <Card.Text>View and manage your AI agents, bookings, and more.</Card.Text>
              <Button variant="primary" onClick={() => navigate('/data/dashboard')}>Go to Data Center</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Settings Center</Card.Title>
              <Card.Text>Configure and manage your application settings.</Card.Text>
              <Button variant="secondary" onClick={() => navigate('/settings')}>Go to Settings Center</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default DashboardLandingPage; 