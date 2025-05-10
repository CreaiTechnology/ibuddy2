import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Container, Row, Col } from 'react-bootstrap';

export default function SettingsLandingPage() {
  const navigate = useNavigate();

  return (
    <Container className="mt-4">
      <h2 className="mb-4">Settings Center</h2>
      <Row>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Auto Reply Settings</Card.Title>
              <Card.Text>Configure auto-reply rules and behaviors.</Card.Text>
              <Button variant="primary" onClick={() => navigate('agent-reply')}>Go to Auto Reply Settings</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Walk-in Booking Settings</Card.Title>
              <Card.Text>Manage walk-in booking options and configurations.</Card.Text>
              <Button variant="primary" onClick={() => navigate('walkin-booking')}>Go to Walk-in Booking Settings</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>On-site Booking Settings</Card.Title>
              <Card.Text>Manage on-site booking options and configurations.</Card.Text>
              <Button variant="primary" onClick={() => navigate('onsite-booking')}>Go to On-site Booking Settings</Button>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <Card.Title>Content Generator Settings</Card.Title>
              <Card.Text>Configure brand and content generation settings.</Card.Text>
              <Button variant="primary" onClick={() => navigate('content-generator')}>Go to Content Generator Settings</Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
} 