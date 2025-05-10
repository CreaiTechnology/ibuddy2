import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, ListGroup, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { CirclePicker } from 'react-color'; // Use CirclePicker for color selection
import { FaEdit, FaTrash, FaPlus, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import * as teamService from '../../services/teamService'; // Import the team service
import { toast } from 'react-toastify';
import './TeamSettingsModal.css'; // Import CSS for styling

// Sub-component for the team form (Create/Edit)
const TeamForm = ({ team, onSave, onCancel, isLoading }) => {
    const [formData, setFormData] = useState({
        name: '',
        colour: '#cccccc', // Default color
        max_overlap: 0,
    });
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (team) {
            setFormData({
                name: team.name || '',
                colour: team.colour || '#cccccc',
                max_overlap: team.max_overlap !== undefined ? team.max_overlap : 0,
            });
            setFormError(''); // Clear error when loading a new team
        } else {
            // Reset form for new team
            setFormData({
                name: '',
                colour: '#f44336', // Default to red for new teams
                max_overlap: 0,
            });
             setFormError('');
        }
    }, [team]);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) : value,
        }));
    };

    const handleColorChange = (color) => {
        setFormData(prev => ({
            ...prev,
            colour: color.hex,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError(''); // Clear previous errors
        if (!formData.name.trim()) {
            setFormError('Team name is required.');
            return;
        }
        if (formData.max_overlap < 0) {
             setFormError('Max Overlap cannot be negative.');
            return;
        }
         // Basic hex color validation
        if (!/^#[0-9A-F]{6}$/i.test(formData.colour)) {
            setFormError('Invalid color format. Please select a valid hex color.');
            return;
        }

        onSave(formData);
    };

    return (
        <Form onSubmit={handleSubmit}>
             {formError && <Alert variant="danger">{formError}</Alert>}
            <Form.Group as={Row} className="mb-3" controlId="teamName">
                <Form.Label column sm={3}>Name:</Form.Label>
                <Col sm={9}>
                    <Form.Control
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Enter team name"
                        disabled={isLoading}
                    />
                </Col>
            </Form.Group>

            <Form.Group as={Row} className="mb-3" controlId="teamMaxOverlap">
                <Form.Label column sm={3}>Max Overlap:</Form.Label>
                <Col sm={9}>
                    <Form.Control
                        type="number"
                        name="max_overlap"
                        value={formData.max_overlap}
                        onChange={handleChange}
                        min="0"
                        required
                        disabled={isLoading}
                    />
                    <Form.Text muted>
                        Maximum concurrent appointments for this team (0 = unlimited).
                    </Form.Text>
                </Col>
            </Form.Group>

            <Form.Group as={Row} className="mb-3" controlId="teamColor">
                <Form.Label column sm={3}>Color:</Form.Label>
                <Col sm={9} className="d-flex align-items-center">
                    <CirclePicker
                        color={formData.colour}
                        onChangeComplete={handleColorChange}
                        // Provide a selection of common colors or customize
                        colors={['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b']}
                        circleSize={24}
                        circleSpacing={10}
                        width="100%"
                        />
                    <span className="selected-color-display ms-3" style={{ backgroundColor: formData.colour }}></span>
                </Col>
            </Form.Group>

            <div className="d-flex justify-content-end mt-4">
                <Button variant="secondary" onClick={onCancel} className="me-2" disabled={isLoading}>
                    <FaTimes className="me-1" /> Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={isLoading}>
                    {isLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1" /> : <FaCheck className="me-1" />}
                    {team ? 'Update Team' : 'Create Team'}
                </Button>
            </div>
        </Form>
    );
};

TeamForm.propTypes = {
    team: PropTypes.object, // null for create, object for edit
    onSave: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
};

// Main Modal Component
function TeamSettingsModal({ isOpen, onClose, onTeamsUpdate }) {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedTeam, setSelectedTeam] = useState(null); // Team being edited
    const [showForm, setShowForm] = useState(false);
    const [teamToDelete, setTeamToDelete] = useState(null); // For delete confirmation
    const [isSubmitting, setIsSubmitting] = useState(false); // Loading state for form submission

    const fetchTeamsData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const fetchedTeams = await teamService.fetchTeams();
            setTeams(fetchedTeams || []);
        } catch (err) {
            console.error("Error fetching teams:", err);
            setError('Failed to load teams. Please try again.');
            toast.error('Failed to load teams.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchTeamsData();
             // Reset state when modal opens
            setSelectedTeam(null);
            setShowForm(false);
            setTeamToDelete(null);
            setError('');
            setIsSubmitting(false);
        }
    }, [isOpen, fetchTeamsData]);

    const handleAddNewTeam = () => {
        setSelectedTeam(null); // Clear selection for create mode
        setShowForm(true);
    };

    const handleEditTeam = (team) => {
        setSelectedTeam(team);
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setSelectedTeam(null);
        setError(''); // Clear form-specific errors on cancel
        setIsSubmitting(false);
    };

    const handleSaveTeam = async (formData) => {
        setIsSubmitting(true);
        setError('');
        try {
            if (selectedTeam) {
                // Update existing team
                await teamService.updateTeam(selectedTeam.id, formData);
                toast.success(`Team "${formData.name}" updated successfully!`);
            } else {
                // Create new team
                await teamService.createTeam(formData);
                toast.success(`Team "${formData.name}" created successfully!`);
            }
            setShowForm(false);
            setSelectedTeam(null);
            await fetchTeamsData(); // Refresh the list
            if (onTeamsUpdate) {
                onTeamsUpdate(); // Notify parent component
            }
        } catch (err) {
            console.error("Error saving team:", err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to save team.';
            setError(errorMsg);
            toast.error(`Error: ${errorMsg}`);
        } finally {
             setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (team) => {
        setTeamToDelete(team);
    };

    const handleConfirmDelete = async () => {
        if (!teamToDelete) return;
        setLoading(true); // Use main loading state for delete action
        setError('');
        try {
            await teamService.deleteTeam(teamToDelete.id);
            toast.success(`Team "${teamToDelete.name}" deleted successfully!`);
            setTeamToDelete(null); // Close confirmation
            await fetchTeamsData(); // Refresh list
             if (onTeamsUpdate) {
                onTeamsUpdate(); // Notify parent component
            }
        } catch (err) {
            console.error("Error deleting team:", err);
             const errorMsg = err.response?.data?.message || err.message || 'Failed to delete team.';
            setError(errorMsg);
            toast.error(`Error: ${errorMsg}`);
        } finally {
            setLoading(false);
            setTeamToDelete(null); // Ensure confirmation is closed even on error
        }
    };

    const handleCancelDelete = () => {
        setTeamToDelete(null);
    };

    const handleCloseModal = () => {
        if (isSubmitting || loading) return; // Prevent closing while busy
        onClose();
    }

    return (
        <Modal show={isOpen} onHide={handleCloseModal} size="lg" backdrop="static" keyboard={false} centered>
            <Modal.Header closeButton>
                <Modal.Title>Manage Teams</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && !showForm && <Alert variant="danger">{error}</Alert>} 
                
                {showForm ? (
                    <TeamForm
                        team={selectedTeam}
                        onSave={handleSaveTeam}
                        onCancel={handleCancelForm}
                        isLoading={isSubmitting}
                    />
                ) : (
                    <>
                        <div className="d-flex justify-content-end mb-3">
                            <Button variant="success" onClick={handleAddNewTeam} disabled={loading}>
                                <FaPlus className="me-1" /> Add New Team
                            </Button>
                        </div>

                        {loading ? (
                            <div className="text-center"><Spinner animation="border" /> Loading Teams...</div>
                        ) : (
                            <ListGroup className="team-list">
                                {teams.length > 0 ? (
                                    teams.map((team) => (
                                        <ListGroup.Item key={team.id} className="d-flex justify-content-between align-items-center team-list-item">
                                            <div className="d-flex align-items-center">
                                                <span className="team-color-indicator me-3" style={{ backgroundColor: team.colour }}></span>
                                                <div>
                                                   <span className="fw-bold">{team.name}</span>
                                                   <small className="d-block text-muted">Max Overlap: {team.max_overlap}</small>
                                                </div>
                                            </div>
                                            <div>
                                                <Button variant="outline-primary" size="sm" className="me-2" onClick={() => handleEditTeam(team)} title="Edit Team">
                                                    <FaEdit />
                                                </Button>
                                                <Button variant="outline-danger" size="sm" onClick={() => handleDeleteClick(team)} title="Delete Team">
                                                    <FaTrash />
                                                </Button>
                                            </div>
                                        </ListGroup.Item>
                                    ))
                                ) : (
                                    <p className="text-center text-muted">No teams found. Add a new team to get started.</p>
                                )}
                            </ListGroup>
                        )}
                    </>
                )}

                {/* Delete Confirmation Modal (Inline for simplicity) */}
                <Modal show={!!teamToDelete} onHide={handleCancelDelete} centered size="sm">
                    <Modal.Header closeButton>
                        <Modal.Title><FaExclamationTriangle className="me-2 text-danger"/> Confirm Delete</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        Are you sure you want to delete the team "<strong>{teamToDelete?.name}</strong>"?
                        This action cannot be undone.
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCancelDelete} disabled={loading}>
                            Cancel
                        </Button>
                        <Button variant="danger" onClick={handleConfirmDelete} disabled={loading}>
                            {loading ? <Spinner as="span" animation="border" size="sm"/> : 'Delete'}
                        </Button>
                    </Modal.Footer>
                </Modal>

            </Modal.Body>
            {/* Optional Footer, maybe just rely on header close button */} 
            {/* <Modal.Footer>
                <Button variant="secondary" onClick={handleCloseModal} disabled={isSubmitting || loading}>
                    Close
                </Button>
            </Modal.Footer> */}
        </Modal>
    );
}

TeamSettingsModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onTeamsUpdate: PropTypes.func, // Callback when teams are updated (created, edited, deleted)
};

export default TeamSettingsModal; 