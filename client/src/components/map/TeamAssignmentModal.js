import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import { fetchTeams } from '../../services/teamService';
import * as appointmentService from '../../services/appointmentService';
import './TeamAssignmentModal.css';

const TeamAssignmentModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  onTeamAssigned 
}) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(appointment?.extendedProps?.teamId || '');
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState('');

  // Load teams when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingTeams(true);
      fetchTeams()
        .then(fetchedTeams => {
          setTeams(fetchedTeams || []);
          // Set the current team as selected if it exists
          setSelectedTeamId(appointment?.extendedProps?.teamId || '');
        })
        .catch(error => {
          console.error("Failed to fetch teams:", error);
          setError("Could not load teams. Please try again.");
        })
        .finally(() => {
          setLoadingTeams(false);
        });
    }
  }, [isOpen, appointment]);

  const handleAssignTeam = async () => {
    if (!appointment || !appointment.id) {
      setError("Invalid appointment data");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare data for API
      const updateData = {
        teamId: selectedTeamId || null // null to unassign team
      };

      // Call API to update appointment
      await appointmentService.updateAppointment(appointment.id, updateData);
      
      toast.success(`Team ${selectedTeamId ? 'assigned' : 'unassigned'} successfully!`);
      
      // Notify parent component about the update
      if (onTeamAssigned) {
        onTeamAssigned({
          appointmentId: appointment.id,
          teamId: selectedTeamId,
          teamName: selectedTeamId ? 
            teams.find(t => t.id === selectedTeamId)?.name : 
            null
        });
      }
      
      onClose();
    } catch (error) {
      console.error("Error assigning team:", error);
      setError(error.message || "Failed to assign team. Please try again.");
      toast.error("Team assignment failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="team-assignment-modal-overlay">
      <div className="team-assignment-modal">
        <div className="modal-header">
          <h3>Assign Team</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <div className="appointment-info">
            <p><strong>Client:</strong> {appointment.title || 'Unnamed Client'}</p>
            <p><strong>Time:</strong> {new Date(appointment.start).toLocaleString()}</p>
            <p><strong>Location:</strong> {appointment.formattedAddress}</p>
          </div>
          
          <div className="team-selector">
            <label htmlFor="team-select">Select Team:</label>
            <select
              id="team-select"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              disabled={loadingTeams || loading}
            >
              <option value="">-- None (Unassigned) --</option>
              {loadingTeams ? (
                <option disabled>Loading teams...</option>
              ) : (
                teams.map(team => (
                  <option 
                    key={team.id} 
                    value={team.id}
                    style={{ color: team.colour }}
                  >
                    {team.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
        
        <div className="modal-footer">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="confirm-button" 
            onClick={handleAssignTeam}
            disabled={loading || loadingTeams}
          >
            {loading ? 'Saving...' : 'Assign Team'}
          </button>
        </div>
      </div>
    </div>
  );
};

TeamAssignmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  appointment: PropTypes.object,
  onTeamAssigned: PropTypes.func
};

export default TeamAssignmentModal; 