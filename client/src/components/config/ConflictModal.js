import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ListGroup } from 'react-bootstrap';
import moment from 'moment';

function ConflictModal({ show, onHide, onForce, conflictData }) {
  if (!conflictData) return null;

  const { details, canForce } = conflictData;
  const { count, maxAllowed, overlappingAppointments } = details || {};

  const handleForceClick = () => {
    if (canForce) {
      onForce();
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title className="text-danger">预约时间冲突</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          您选择的时间段与现有预约存在严重冲突。
          该时段已有 <strong>{count ?? 'N/A'}</strong> 个预约，
          系统允许的最大重叠数为 <strong>{maxAllowed ?? 'N/A'}</strong>。
        </p>
        {overlappingAppointments && overlappingAppointments.length > 0 && (
          <>
            <h6>冲突的预约:</h6>
            <ListGroup variant="flush" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {overlappingAppointments.map(appt => (
                <ListGroup.Item key={appt.id}>
                  <strong>{appt.title}</strong><br />
                  <small>
                    {moment(appt.start).format('YYYY-MM-DD HH:mm')} - {moment(appt.end).format('HH:mm')}
                  </small>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
        {canForce && (
          <p className="mt-3 text-warning">
            <small>您可以选择强制创建/更新此预约，但这可能导致服务冲突。</small>
          </p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          取消
        </Button>
        {canForce && (
          <Button variant="warning" onClick={handleForceClick}>
            强制预约
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}

ConflictModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onForce: PropTypes.func.isRequired,
  conflictData: PropTypes.shape({
    details: PropTypes.shape({
      count: PropTypes.number,
      maxAllowed: PropTypes.number,
      overlappingAppointments: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        title: PropTypes.string,
        start: PropTypes.string, // ISO string
        end: PropTypes.string,   // ISO string
      }))
    }),
    canForce: PropTypes.bool,
    // originalData, isEdit, appointmentId are used in BookingConfig, not needed here
  })
};

export default ConflictModal; 