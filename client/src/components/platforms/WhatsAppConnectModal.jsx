import React, { useState } from 'react';
import { Modal, Button, Form, Spinner, Alert } from 'react-bootstrap';

function WhatsAppConnectModal({ show, onHide, onSubmit, isConnecting, error }) {
  const [apiToken, setApiToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [validated, setValidated] = useState(false);

  const handleSubmit = (event) => {
    const form = event.currentTarget;
    event.preventDefault(); // Prevent default form submission
    event.stopPropagation();

    if (form.checkValidity() === false) {
      setValidated(true); // Show validation feedback
    } else {
      setValidated(false);
      onSubmit({ apiToken, phoneNumberId }); // Call the onSubmit prop with credentials
    }
  };

  // Reset form when modal is hidden/shown
  React.useEffect(() => {
    if (!show) {
      setApiToken('');
      setPhoneNumberId('');
      setValidated(false);
    }
  }, [show]);


  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>连接 WhatsApp Cloud API</Modal.Title>
      </Modal.Header>
      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        <Modal.Body>
          <p>请输入您的 WhatsApp Cloud API 永久访问令牌和电话号码 ID。</p>
          <p>您可以从 Meta for Developers 或 Business Manager 获取这些信息。</p>
          
          {error && <Alert variant="danger">{error}</Alert>}

          <Form.Group className="mb-3" controlId="formWhatsAppApiToken">
            <Form.Label>API 永久访问令牌 (Permanent Token)</Form.Label>
            <Form.Control
              type="password" // Use password type for sensitive tokens
              placeholder="输入您的访问令牌"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              required
              disabled={isConnecting}
            />
            <Form.Control.Feedback type="invalid">
              请输入您的 API 访问令牌。
            </Form.Control.Feedback>
          </Form.Group>

          <Form.Group className="mb-3" controlId="formWhatsAppPhoneNumberId">
            <Form.Label>电话号码 ID (Phone Number ID)</Form.Label>
            <Form.Control
              type="text"
              placeholder="输入您的电话号码 ID"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              required
              disabled={isConnecting}
            />
             <Form.Control.Feedback type="invalid">
              请输入您的电话号码 ID。
            </Form.Control.Feedback>
          </Form.Group>

        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isConnecting}>
            取消
          </Button>
          <Button variant="primary" type="submit" disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-1"
                />
                连接中...
              </>
            ) : (
              '连接'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

export default WhatsAppConnectModal; 