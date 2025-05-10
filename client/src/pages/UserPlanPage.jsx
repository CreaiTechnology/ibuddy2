import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Container, Card, Button, Row, Col, Alert } from 'react-bootstrap';

const planOrder = ['free', 'proA', 'proB', 'enterprise'];
const plans = [
  { key: 'free', name: 'Free', description: 'Basic features' },
  { key: 'proA', name: 'Pro A', description: 'Auto Reply & Scheduling' },
  { key: 'proB', name: 'Pro B', description: 'Advanced Analytics & Content' },
  { key: 'enterprise', name: 'Enterprise', description: 'Custom Solutions & Support' },
];

export default function UserPlanPage() {
  const { user, updatePlan } = useAuth();
  const [status, setStatus] = useState({});

  const currentIndex = planOrder.indexOf(user?.plan || 'free');

  const handleUpgrade = async (planKey) => {
    setStatus({ loading: planKey });
    const res = await updatePlan(planKey);
    if (res.success) {
      setStatus({ success: `Upgraded to ${planKey}` });
    } else {
      setStatus({ error: 'Upgrade failed' });
    }
  };

  return (
    <Container className="py-4">
      <h2>Subscription Plans</h2>
      {status.error && <Alert variant="danger">{status.error}</Alert>}
      {status.success && <Alert variant="success">{status.success}</Alert>}
      <Row>
        {plans.map(plan => {
          const idx = planOrder.indexOf(plan.key);
          const isCurrent = idx === currentIndex;
          const isUpgradeable = idx > currentIndex;
          return (
            <Col sm={6} md={3} key={plan.key} className="mb-3">
              <Card border={isCurrent ? 'primary' : undefined}>
                <Card.Body>
                  <Card.Title>{plan.name}</Card.Title>
                  <Card.Text>{plan.description}</Card.Text>
                  {isCurrent ? (
                    <Button variant="secondary" disabled>Current Plan</Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={!isUpgradeable || status.loading === plan.key}
                    >
                      {status.loading === plan.key ? 'Processing...' : isUpgradeable ? 'Upgrade' : 'Locked'}
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Container>
  );
} 