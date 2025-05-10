import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import RuleBrowser from '../components/dashboard/components/RuleBrowser';
import { useFeatureGuard } from '../hooks/useFeatureGuard';

export default function AutoReplySettingsPage() {
  useFeatureGuard('free');
  document.title = 'Auto Reply Settings';
  return (
    <Container fluid className="mt-4">
      <Row>
        <Col>
          <h2>Auto Reply Settings</h2>
          <RuleBrowser />
        </Col>
      </Row>
    </Container>
  );
} 