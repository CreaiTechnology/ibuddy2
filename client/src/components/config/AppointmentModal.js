import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './AppointmentModal.css';
import moment from 'moment';
import { toast } from 'react-toastify';
import { fetchTeams } from '../../services/teamService';

const AppointmentModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete = () => {},
  selectedSlot = null,
  services, 
  appointmentToEdit = null,
  editMode = false,
  agentType = 'walkin'
}) => {
  console.log('[AppointmentModal] Rendering. isOnSite:', agentType === 'on-site');
  const [clientName, setClientName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [source, setSource] = useState('walkin'); // Default to walkin
  const [contactNumber, setContactNumber] = useState(''); // Add contact number
  const [notes, setNotes] = useState(''); // Add notes field
  const [errors, setErrors] = useState({});

  // NEW States for On-Site
  const [teamId, setTeamId] = useState('');
  const [address, setAddress] = useState({
      line1: '',
      line2: '',
      city: '',
      postalCode: '',
      country: ''
  });

  // NEW: State for Teams
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // NEW: Determine if Team selection is needed based on agentType
  const isOnSite = agentType === 'on-site';

  // Array of available sources
  const sources = [
    { id: 'walkin', name: 'Walk-in' },
    { id: 'whatsapp', name: 'WhatsApp' },
    { id: 'messenger', name: 'Messenger' },
    { id: 'instagram', name: 'Instagram' },
    { id: 'other', name: 'Other' }
  ];

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens or when appointment to edit changes
      if (editMode && appointmentToEdit) {
        const start = moment(appointmentToEdit.start);
        const end = moment(appointmentToEdit.end);
        
        const props = appointmentToEdit;

        setClientName(props.clientName || '');
        setServiceId(props.serviceId || '');
        setAppointmentDate(start.format('YYYY-MM-DD'));
        setStartTime(start.format('HH:mm'));
        setEndTime(end.format('HH:mm'));
        setSource(props.source || 'walkin');
        setContactNumber(props.contactNumber || '');
        setNotes(props.notes || '');

        // Populate On-Site fields if editing an on-site appointment
        if (isOnSite) {
          setTeamId(props.teamId || '');
          setAddress({
            line1: props.address?.line1 || '',
            line2: props.address?.line2 || '',
            city: props.address?.city || '',
            postalCode: props.address?.postalCode || '',
            country: props.address?.country || ''
          });
        } else {
          // Reset on-site fields if switching from on-site edit to walk-in edit/create
          setTeamId('');
          setAddress({ line1: '', line2: '', city: '', postalCode: '', country: '' });
        }

      } else if (selectedSlot) {
        const start = moment(selectedSlot.start);
        
        setClientName('');
        setServiceId('');
        setAppointmentDate(start.format('YYYY-MM-DD'));
        setStartTime(start.format('HH:mm'));
        setEndTime(moment(selectedSlot.end).format('HH:mm'));
        setSource(isOnSite ? 'other' : 'walkin'); // Default source based on type
        setContactNumber('');
        setNotes('');

        // Reset On-Site fields for new appointment
        setTeamId('');
        setAddress({ line1: '', line2: '', city: '', postalCode: '', country: '' });

      }
      setErrors({});

      // Fetch teams only if it's an on-site booking type
      if (isOnSite) {
        setLoadingTeams(true);
        fetchTeams()
          .then(fetchedTeams => {
            setTeams(fetchedTeams || []);
          })
          .catch(error => {
            console.error("Failed to fetch teams:", error);
            toast.error("Could not load teams. Please try again.");
            // Optionally close modal or handle error differently
          })
          .finally(() => {
            setLoadingTeams(false);
          });
      }
    }
  }, [isOpen, editMode, appointmentToEdit, selectedSlot, isOnSite]);

  const handleAddressChange = (e) => {
      const { name, value } = e.target;
      setAddress(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!clientName.trim()) {
      newErrors.clientName = 'Client Name is required';
    }
    
    if (!serviceId) {
      newErrors.serviceId = 'Service is required';
    }
    
    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }
    
    if (!endTime) {
      newErrors.endTime = 'End time is required';
    }
    
    if (startTime && endTime) {
      const start = moment(`${appointmentDate} ${startTime}`);
      const end = moment(`${appointmentDate} ${endTime}`);
      
      if (end.isSameOrBefore(start)) {
        newErrors.endTime = 'End time must be after start time';
      }
    }
    
    // Validate contact number format if provided
    if (contactNumber && !/^\+?[0-9\s\-()]{7,}$/.test(contactNumber)) {
      newErrors.contactNumber = 'Please enter a valid phone number';
    }
    
    // Validate Team ID if on-site
    if (isOnSite && !teamId) {
      newErrors.teamId = 'Team selection is required for on-site bookings';
    }
    
    // On-Site Field Validation
    if (isOnSite) {
        if (!address.line1?.trim()) {
            newErrors.addressLine1 = 'Address Line 1 is required';
        }
        if (!address.city?.trim()) {
            newErrors.addressCity = 'City is required';
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    console.log(`[AppointmentModal] handleSubmit: serviceId='${serviceId}', agentType='${agentType}'`);

    const start = moment(`${appointmentDate} ${startTime}`).toDate();
    const end = moment(`${appointmentDate} ${endTime}`).toDate();
    
    const appointmentData = {
      clientName: clientName.trim(),
      serviceId: serviceId,
      start,
      end,
      source,
      contactNumber: contactNumber || undefined,
      notes: notes || undefined,
      bookingType: agentType,
      ...(isOnSite && {
          teamId: teamId,
          address: {
              line1: address.line1?.trim() || undefined,
              line2: address.line2?.trim() || undefined,
              city: address.city?.trim() || undefined,
              postalCode: address.postalCode?.trim() || undefined,
              country: address.country?.trim() || undefined
          }
      })
    };

    // Remove undefined address fields before sending
    if (appointmentData.address) {
        Object.keys(appointmentData.address).forEach(key =>
            appointmentData.address[key] === undefined && delete appointmentData.address[key]
        );
        if (Object.keys(appointmentData.address).length === 0) {
            delete appointmentData.address;
        }
    }
    
    if (editMode && appointmentToEdit) {
      appointmentData.id = appointmentToEdit.id || appointmentToEdit._id;
    }
    
    console.log('[AppointmentModal] Calling onSave with data:', appointmentData);
    onSave(appointmentData);
  };

  const handleServiceChange = (e) => {
    const selectedValue = e.target.value;
    console.log('[AppointmentModal] Service selected. e.target.value:', selectedValue);
    setServiceId(selectedValue);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content appointment-modal-content">
        <div className="modal-header">
          <h2>{editMode ? 'Edit' : 'New'} {isOnSite ? 'On-Site Appointment' : 'Appointment'}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="clientName">Client Name</label>
            <input
              id="clientName"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className={errors.clientName ? 'error' : ''}
              placeholder="Enter client's name"
            />
            {errors.clientName && <div className="error-message">{errors.clientName}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="source">Source</label>
            <select
              id="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {sources.map(src => (
                <option key={src.id} value={src.id}>{src.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="service">Service</label>
            <select
              id="service"
              value={serviceId}
              onChange={handleServiceChange}
              className={errors.serviceId ? 'error' : ''}
            >
              <option value="">Select a service</option>
              {services.map((service) => {
                const id = service.id || service._id;
                console.log(`[AppointmentModal] Mapping service: name=${service.name}, assigning value=${id} to option`);
                return (
                  <option key={id} value={id}>
                    {service.name} ({service.duration} min)
                  </option>
                );
              })}
            </select>
            {errors.serviceId && <div className="error-message">{errors.serviceId}</div>}
          </div>
          
          {/* --- Team Selection (Conditional) --- */}
          {isOnSite && (
            <div className="form-group">
              <label htmlFor="teamId">Team *</label>
              <select
                id="teamId"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                disabled={loadingTeams} // Disable while loading
                className={errors.teamId ? 'error' : ''}
              >
                <option value="">{loadingTeams ? 'Loading teams...' : '-- Select Team --'}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {errors.teamId && <p className="error-message">{errors.teamId}</p>}
            </div>
          )}
          {/* ------------------------------------ */}
          
          <div className="form-group">
            <label htmlFor="contact-number">Contact Number</label>
            <input
              id="contact-number"
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+1 (234) 567-8910"
              className={errors.contactNumber ? 'error' : ''}
            />
            {errors.contactNumber && <div className="error-message">{errors.contactNumber}</div>}
          </div>
          
          {isOnSite && (
             <fieldset className="address-fieldset">
                <legend>Address</legend>
                <div className="form-group">
                    <label htmlFor="addressLine1">Address Line 1</label>
                    <input
                        id="addressLine1"
                        name="line1"
                        type="text"
                        value={address.line1}
                        onChange={handleAddressChange}
                        className={errors.addressLine1 ? 'error' : ''}
                        placeholder="Street address, P.O. box, company name, c/o"
                    />
                     {errors.addressLine1 && <div className="error-message">{errors.addressLine1}</div>}
                </div>
                <div className="form-group">
                    <label htmlFor="addressLine2">Address Line 2 (Optional)</label>
                    <input
                        id="addressLine2"
                        name="line2"
                        type="text"
                        value={address.line2}
                        onChange={handleAddressChange}
                        placeholder="Apartment, suite, unit, building, floor, etc."
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="addressCity">City</label>
                        <input
                            id="addressCity"
                            name="city"
                            type="text"
                            value={address.city}
                            onChange={handleAddressChange}
                            className={errors.addressCity ? 'error' : ''}
                            placeholder="City"
                        />
                        {errors.addressCity && <div className="error-message">{errors.addressCity}</div>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="addressPostalCode">Postal Code (Optional)</label>
                        <input
                            id="addressPostalCode"
                            name="postalCode"
                            type="text"
                            value={address.postalCode}
                            onChange={handleAddressChange}
                            placeholder="Postal Code"
                        />
                    </div>
                </div>
                 <div className="form-group">
                    <label htmlFor="addressCountry">Country (Optional)</label>
                    <input
                        id="addressCountry"
                        name="country"
                        type="text"
                        value={address.country}
                        onChange={handleAddressChange}
                        placeholder="Country"
                    />
                </div>
             </fieldset>
           )}
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start-time">Start Time</label>
              <input
                id="start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={errors.startTime ? 'error' : ''}
              />
              {errors.startTime && <div className="error-message">{errors.startTime}</div>}
            </div>
            
            <div className="form-group">
              <label htmlFor="end-time">End Time</label>
              <input
                id="end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={errors.endTime ? 'error' : ''}
              />
              {errors.endTime && <div className="error-message">{errors.endTime}</div>}
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              placeholder="Add any additional information here"
            ></textarea>
          </div>
          
          <div className="form-actions">
            {editMode && (
              <button
                type="button"
                className="delete-button"
                onClick={() => onDelete(appointmentToEdit.id || appointmentToEdit._id)}
              >
                Delete
              </button>
            )}
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="save-button">
              {editMode ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

AppointmentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  selectedSlot: PropTypes.shape({
    start: PropTypes.instanceOf(Date),
    end: PropTypes.instanceOf(Date)
  }),
  services: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string.isRequired,
      duration: PropTypes.number.isRequired
    })
  ).isRequired,
  appointmentToEdit: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    _id: PropTypes.string,
    clientName: PropTypes.string,
    serviceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    source: PropTypes.string,
    contactNumber: PropTypes.string,
    notes: PropTypes.string,
    start: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
    end: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
    teamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    address: PropTypes.shape({
        line1: PropTypes.string,
        line2: PropTypes.string,
        city: PropTypes.string,
        postalCode: PropTypes.string,
        country: PropTypes.string
    })
  }),
  editMode: PropTypes.bool,
  agentType: PropTypes.string
};

export default AppointmentModal; 