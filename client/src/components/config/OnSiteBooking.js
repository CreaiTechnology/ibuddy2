import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Removed PropTypes import as agentType prop is removed for now
// import PropTypes from 'prop-types'; 
import './BookingConfig.css'; // Reuse existing CSS for now
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import momentPlugin from '@fullcalendar/moment';
import scrollGridPlugin from '@fullcalendar/scrollgrid';
import moment from 'moment';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import * as appointmentService from '../../services/appointmentService';
import { fetchServices as fetchServicesFromService } from '../../services/serviceService';
// Import team service (Assuming it will be created)
import * as teamService from '../../services/teamService'; // We'll need to create this service
import { useLoading } from '../../contexts/LoadingContext';
import AppointmentModal from './AppointmentModal'; // Reuse or create OnSiteAppointmentModal later
import ConflictModal from './ConflictModal';
import TeamSettingsModal from './TeamSettingsModal'; // <-- Import TeamSettingsModal
import { FaCog, FaSyncAlt, FaUsers } from 'react-icons/fa'; // Using FaSyncAlt for refresh, FaUsers for Teams
// Removed AppointmentStats import for now
// import AppointmentStats from '../statistics/AppointmentStats';
import axiosInstance from '../../api/axiosInstance'; // Use the configured instance
import AddressInput from '../address/AddressInput';
import Select from 'react-select'; 

// Simple spinner component
const LoadingSpinner = () => <div className="loading-spinner">Loading...</div>;

// API Base URL (Consider moving to a config file)
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Renamed component to OnSiteBooking
function OnSiteBooking() { 
  // --- State Variables --- 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [services, setServices] = useState([]); // Keep services for now, might change meaning for OnSite
  const [teams, setTeams] = useState([]); // <-- Add state for teams
  const [appointments, setAppointments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); 
  const [editMode, setEditMode] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  const { initialBookingConfigLoaded, setInitialBookingConfigLoaded } = useLoading();
  const calendarRef = useRef(null);
  // Removed sourceFilters state as it might not apply to OnSite
  // const [sourceFilters, setSourceFilters] = useState({...}); 
  const [viewType] = useState('timeGridWeek');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const [showTeamSettingsModal, setShowTeamSettingsModal] = useState(false); // <-- Add state for team modal
  // Removed showStats state
  // const [showStats, setShowStats] = useState(false);
  const [clientName, setClientName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', postalCode: '', country: '' });
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamOptions, setTeamOptions] = useState([]);
  
  // --- Data Fetching --- 
  const fetchOnSiteData = useCallback(async (dateRange = null) => {
    setLoading(true);
    setError(null);
    console.log('[OnSiteBooking] Fetching appointments and teams...'); // Also fetching teams now
    
    try {
      const filters = {};
      if (dateRange) {
        filters.start_gte = moment(dateRange.start).toISOString();
        filters.start_lte = moment(dateRange.end).toISOString();
      }

      // Always include booking_type filter for on-site appointments
      filters.booking_type = 'on-site';

      // Fetch teams AGAIN here or rely on state? Let's rely on state for now,
      // but ensure teams are fresh if modal is used.
      // const freshTeams = await teamService.fetchTeams();
      // setTeams(freshTeams || []); // Update teams state if fetching again

      // Fetch appointments (API now returns team info)
      const appointmentsResponse = await appointmentService.getAppointments(filters);
      const fetchedAppointments = appointmentsResponse.data || [];
      console.log('[OnSiteBooking] Fetched appointments:', fetchedAppointments);

      // Map backend data to FullCalendar event format
      const events = fetchedAppointments.map(appointment => {
        const service = services.find(s => s.id === appointment.serviceId);
        // Use the CURRENT teams state for mapping
        const team = teams.find(t => t.id === appointment.teamId);
        
        const eventColor = team?.colour || service?.colour || '#adb5bd'; // Prioritize team color
        
        return {
          id: appointment.id,
          title: appointment.clientName || appointment.title || 'On-site Visit', 
          start: new Date(appointment.start),
          end: new Date(appointment.end),
          serviceId: appointment.serviceId,
          teamId: appointment.teamId,
          clientName: appointment.clientName,
          clientPhone: appointment.clientPhone,
          address: { // Store address object
            line1: appointment.address?.line1,
            line2: appointment.address?.line2,
            city: appointment.address?.city,
            postalCode: appointment.address?.postalCode,
            country: appointment.address?.country
          },
          status: appointment.status,
          extendedProps: {
            ...appointment.extendedProps, // Keep original extendedProps
            service: service || { name: 'Unknown Service', colour: '#CCCCCC' },
            team: team || { name: 'Unassigned Team', id: appointment.teamId }, // Include team info
            address_line1: appointment.address?.line1,
            address_line2: appointment.address?.line2,
            city: appointment.address?.city,
            postal_code: appointment.address?.postalCode,
            country: appointment.address?.country,
            clientName: appointment.clientName,
            clientPhone: appointment.clientPhone,
            status: appointment.status,
            // Ensure serviceId and teamId are in extendedProps for editing
            serviceId: appointment.serviceId,
            teamId: appointment.teamId,
          },
          backgroundColor: eventColor, 
          borderColor: eventColor    
        };
      });
      
      setAppointments(events);
    } catch (error) {
      console.error('[OnSiteBooking] Failed to fetch data:', error.response || error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to load on-site data";
      setError(errorMsg);
      // Avoid toast here if it's background refresh? Maybe only toast on user action
      // toast.error(errorMsg);
    } finally {
        setLoading(false);
    }
  }, [services, teams]); // Ensure 'teams' is a dependency

  // Handle datesSet 
  const handleDatesSet = useCallback((dateInfo) => {
    if (!loading) {
      fetchOnSiteData({ start: dateInfo.start, end: dateInfo.end });
    }
  }, [fetchOnSiteData, loading]);

  // Effect for INITIAL data loading
  useEffect(() => {
    if (!initialBookingConfigLoaded) {
      console.log("[OnSiteBooking] Performing initial data load...");
      setError('');
      setLoading(true);

      Promise.all([
        fetchServicesFromService(),
        teamService.fetchTeams(), // Fetch teams
        appointmentService.getAppointments({
           start_gte: moment().startOf('isoWeek').toISOString(),
           start_lte: moment().endOf('isoWeek').toISOString(),
           booking_type: 'on-site' // Explicitly include booking type filter
        })
      ])
      .then(([fetchedServices, fetchedTeams, initialAppointmentsResult]) => {
          console.log('[OnSiteBooking] Initial data fetched:', { fetchedServices, fetchedTeams, initialAppointmentsResult });
          const currentServices = fetchedServices || [];
          const currentTeams = fetchedTeams || []; // <-- Use fetched teams
          setServices(currentServices);
          setTeams(currentTeams); // <-- Set teams state

          const initialAppointments = initialAppointmentsResult?.data || [];

          // Map initial appointments (using fetchedTeams directly)
          const events = initialAppointments.map(appointment => {
            const service = currentServices.find(s => s.id === appointment.serviceId);
            const team = currentTeams.find(t => t.id === appointment.teamId);
            const eventColor = team?.colour || service?.colour || '#adb5bd';
            return {
                id: appointment.id,
                title: appointment.clientName || appointment.title || 'On-site Visit',
                start: new Date(appointment.start),
                end: new Date(appointment.end),
                serviceId: appointment.serviceId,
                teamId: appointment.teamId,
                clientName: appointment.clientName,
                clientPhone: appointment.clientPhone,
                address: {
                    line1: appointment.address?.line1,
                    line2: appointment.address?.line2,
                    city: appointment.address?.city,
                    postalCode: appointment.address?.postalCode,
                    country: appointment.address?.country
                },
                status: appointment.status,
                extendedProps: {
                    ...appointment.extendedProps,
                    service: service || { name: 'Unknown Service', colour: '#CCCCCC' },
                    team: team || { name: 'Unassigned Team', id: appointment.teamId },
                    address_line1: appointment.address?.line1,
                    address_line2: appointment.address?.line2,
                    city: appointment.address?.city,
                    postal_code: appointment.address?.postalCode,
                    country: appointment.address?.country,
                    clientName: appointment.clientName,
                    clientPhone: appointment.clientPhone,
                    status: appointment.status,
                    serviceId: appointment.serviceId,
                    teamId: appointment.teamId,
                },
                backgroundColor: eventColor,
                borderColor: eventColor
            };
           });
          setAppointments(events);
          setInitialBookingConfigLoaded(true);
      })
      .catch((err) => {
          console.error("[OnSiteBooking] Initial load failed:", err);
          setError("Failed to load initial booking data.");
          setInitialBookingConfigLoaded(true); // Mark as loaded even on error
      })
      .finally(() => {
          setLoading(false);
      });
    }
    // Intentionally not including fetchOnSiteData here to avoid potential loops on complex state updates
  }, [initialBookingConfigLoaded, setInitialBookingConfigLoaded]);

  // --- FullCalendar Interaction Handlers (Keep similar structure, adapt data mapping) ---
  const handleDateSelect = useCallback((selectInfo) => {
    if (moment(selectInfo.start).isBefore(moment().subtract(1, 'minute'))) {
      toast.error("Cannot create appointments in the past");
      selectInfo.view.calendar.unselect();
      return;
    }
    setSelectedSlot({
        start: selectInfo.start,
        end: selectInfo.end,
        allDay: selectInfo.allDay 
    });
    setEditMode(false); 
    setAppointmentToEdit(null);
    setIsModalOpen(true);
  }, []);

  const handleEventClick = useCallback((clickInfo) => {
    console.log('[OnSiteBooking] Event clicked:', clickInfo.event);
    const event = clickInfo.event;
    const props = event.extendedProps;
    // Map FullCalendar event to appointmentToEdit structure for OnSite
    const mappedEvent = {
        id: event.id,
        start: event.start,
        end: event.end,
        // Ensure serviceId and teamId are correctly retrieved from extendedProps
        serviceId: props?.serviceId,
        teamId: props?.teamId,
        clientName: props?.clientName || event.title,
        clientPhone: props?.clientPhone,
        address: { // Map address fields from extendedProps
           line1: props?.address_line1,
           line2: props?.address_line2,
           city: props?.city,
           postalCode: props?.postal_code,
           country: props?.country
        },
        status: props?.status || 'confirmed'
    };
    console.log('[OnSiteBooking] Mapped event for edit:', mappedEvent); // Debug log
    setSelectedSlot({ start: event.start, end: event.end });
    setEditMode(true);
    setAppointmentToEdit(mappedEvent);
    setIsModalOpen(true);
  }, []); 

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedSlot(null);
    setEditMode(false);
    setAppointmentToEdit(null);
  }, []);

  const handleCloseConflictModal = useCallback(() => {
    setShowConflictModal(false);
    setConflictData(null);
  }, []);

  // --- Team Settings Modal Handlers ---
  const handleOpenTeamSettingsModal = useCallback(() => {
    setShowTeamSettingsModal(true);
  }, []);
  const handleCloseTeamSettingsModal = useCallback(() => {
    setShowTeamSettingsModal(false);
  }, []);

  // --- Callback to refresh teams and appointments after team updates ---
   const handleTeamsUpdated = useCallback(async () => {
    console.log("[OnSiteBooking] Teams updated, refreshing teams and appointments...");
    setLoading(true); // Show loading indicator during refresh
    try {
        // Refetch teams
        const refreshedTeams = await teamService.fetchTeams();
        setTeams(refreshedTeams || []);

        // Refetch appointments for the current view
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            const currentView = calendarApi.view;
            await fetchOnSiteData({ start: currentView.activeStart, end: currentView.activeEnd });
        } else {
            // Fallback if calendar ref is not available (e.g., during initial load)
            await fetchOnSiteData();
        }
    } catch (error) {
        console.error("[OnSiteBooking] Error refreshing data after team update:", error);
        toast.error("Failed to refresh data after team update.");
    } finally {
        setLoading(false);
    }
}, [fetchOnSiteData]); // Include fetchOnSiteData

  // --- Save/Delete Handlers (Need significant updates for OnSite) ---
  const handleSaveAppointment = useCallback(async (appointmentDataFromModal) => {
    console.log('[OnSiteBooking] Saving appointment:', appointmentDataFromModal);
    setLoading(true);
    const isEdit = editMode;
    const originalAppointmentId = appointmentToEdit?.id;

    try {
      // Prepare dataToSend with address, team_id, and booking_type for OnSite
      const dataToSend = {
        start: appointmentDataFromModal.start,
        end: appointmentDataFromModal.end,
        serviceId: appointmentDataFromModal.serviceId,
        teamId: appointmentDataFromModal.teamId, // Using teamId consistently
        clientName: appointmentDataFromModal.clientName,
        clientPhone: appointmentDataFromModal.clientPhone,
        status: appointmentDataFromModal.status,
        // Explicitly set booking type to on-site
        bookingType: 'on-site',
        // Address fields from modal
        address: {
          line1: appointmentDataFromModal.address?.line1,
          line2: appointmentDataFromModal.address?.line2,
          city: appointmentDataFromModal.address?.city,
          postalCode: appointmentDataFromModal.address?.postalCode,
          country: appointmentDataFromModal.address?.country
        }
      };

      console.log('[OnSiteBooking] Data being sent to API:', dataToSend); // Debug log

      let savedAppointmentResponse; // Changed variable name
      if (isEdit && originalAppointmentId) {
        console.log(`[OnSiteBooking] Updating appointment ${originalAppointmentId}`);
        savedAppointmentResponse = await appointmentService.updateAppointment(originalAppointmentId, dataToSend);
        toast.success('Appointment updated successfully!');
      } else {
        console.log('[OnSiteBooking] Creating new appointment');
        savedAppointmentResponse = await appointmentService.createAppointment(dataToSend);
        toast.success('Appointment created successfully!');
      }

      // Check for overlap warning in the response structure (assuming it's returned directly)
      if (savedAppointmentResponse?.overlapWarning) {
        toast.warning(savedAppointmentResponse.overlapWarning.message || 'Potential time conflict detected.');
      } else if (savedAppointmentResponse?.data?.overlapWarning) { // Or if nested under 'data'
         toast.warning(savedAppointmentResponse.data.overlapWarning.message || 'Potential time conflict detected.');
      }

      handleCloseModal();
      // Trigger fetchOnSiteData to refresh the calendar with the latest data
      if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          const currentView = calendarApi.view;
          fetchOnSiteData({ start: currentView.activeStart, end: currentView.activeEnd });
      } else {
           fetchOnSiteData(); // Fallback fetch
      }

    } catch (error) {
      console.error('[OnSiteBooking] Error saving appointment:', error);
      // Check if the error structure indicates a conflict
      const conflictErrorData = error.response?.data;
      if (conflictErrorData?.isConflict || error.isConflict) { // Check for specific flag or status code
          console.log('Conflict detected:', conflictErrorData || error.details);
          setConflictData({
              details: (conflictErrorData && conflictErrorData.details) || error.details || 'Overlap detected with existing appointments.',
              originalData: dataToSend, // Send the data that was attempted
              isEdit: isEdit,
              appointmentId: originalAppointmentId,
              canForce: (conflictErrorData && conflictErrorData.canForce !== undefined) ? conflictErrorData.canForce : 
                       (error.canForce !== undefined ? error.canForce : true) // Assume force is possible if not specified
          });
          setIsModalOpen(false); // Close the appointment modal first
          setShowConflictModal(true);
      } else {
          const errorMsg = (conflictErrorData && conflictErrorData.message) || error.message || "Failed to save appointment";
          setError(errorMsg); // Set component error state
          toast.error(`Error: ${errorMsg}`); // Show toast notification
          // Keep appointment modal open on general errors? Or close?
          // handleCloseModal(); // Close modal on generic error
      }
    } finally {
      setLoading(false);
    }
  }, [editMode, appointmentToEdit, handleCloseModal, fetchOnSiteData, teams, services]); // Keep dependencies

  const handleForceSubmit = useCallback(async () => {
    if (!conflictData) return;
    setLoading(true);
    setShowConflictModal(false);
    const { originalData, isEdit, appointmentId } = conflictData;
    // Ensure the 'force' flag is added correctly and booking type is set
    const forceData = { 
      ...originalData, 
      force: true,
      bookingType: 'on-site' // Explicitly set booking type for forced submissions
    };
    console.log('[OnSiteBooking] Forcing submit with data:', forceData); // Debug log
    try {
      if (isEdit && appointmentId) {
        await appointmentService.updateAppointment(appointmentId, forceData);
        toast.warning('Appointment updated with overlap (forced).');
      } else {
        await appointmentService.createAppointment(forceData);
        toast.warning('Appointment created with overlap (forced).');
      }
      setConflictData(null);
      // Refresh calendar after successful force submit
      if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          const currentView = calendarApi.view;
          fetchOnSiteData({ start: currentView.activeStart, end: currentView.activeEnd });
      } else {
           fetchOnSiteData(); // Fallback fetch
      }
    } catch (error) {
        console.error('[OnSiteBooking] Error during force submit:', error);
        const errorMsg = error.response?.data?.message || error.message || "Failed to force save appointment";
        setError(errorMsg);
        toast.error(`Force Save Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [conflictData, fetchOnSiteData]);

  const handleDeleteAppointment = useCallback(async (appointmentId) => {
    if (!editMode || !appointmentToEdit || appointmentId !== appointmentToEdit.id) {
        console.warn("Delete condition not met:", {editMode, appointmentToEdit, appointmentId});
        return;
    }
    console.log(`[OnSiteBooking] Attempting to delete appointment ${appointmentId}`); // Debug log
    setLoading(true);
    try {
      await appointmentService.deleteAppointment(appointmentId);
      // Update state locally BEFORE closing modal for smoother UX
      setAppointments(prev => prev.filter(app => app.id !== appointmentId));
      toast.success('Appointment deleted successfully');
      handleCloseModal(); // Close modal after state update & success
      // No need to call fetchOnSiteData here as we updated locally
    } catch (error) {
      console.error('[OnSiteBooking] Failed to delete appointment:', error);
      toast.error("Failed to delete appointment.");
       setLoading(false); // Ensure loading is reset on error
    }
    // setLoading(false); // Removed from here, handled in try/catch
  }, [editMode, appointmentToEdit, handleCloseModal]); // Removed fetchOnSiteData dependency

  // --- Event Rendering (Needs update for OnSite) ---
  const renderEventContent = (eventInfo) => {
    const props = eventInfo.event.extendedProps;
    const serviceName = props.service?.name || 'Unknown Svc';
    const teamName = props.team?.name || 'Unassigned'; // Get team name
    // Construct address string (simplified)
    const addressDisplay = [props.address_line1, props.city].filter(Boolean).join(', ') || 'No address';

    const startTime = moment(eventInfo.event.start).format('HH:mm');
    const endTime = moment(eventInfo.event.end).format('HH:mm');
    const timeString = `${startTime}-${endTime}`;

    // Tooltip content
    const tooltipTitle = `Client: ${props.clientName || eventInfo.event.title}
Phone: ${props.clientPhone || 'N/A'}
Service: ${serviceName}
Team: ${teamName}
Address: ${props.address_line1 || ''} ${props.address_line2 || ''} ${props.city || ''} ${props.postal_code || ''} ${props.country || ''}`.trim();

    return (
      <div className="fc-event-main-custom" title={tooltipTitle}>
        <div className="fc-event-time">{timeString}</div>
        <div className="fc-event-title">{props.clientName || eventInfo.event.title}</div>
        {/* Conditionally display phone if screen width allows? Or keep it? */}
        <div className="fc-event-details">
            <span>Team: {teamName}</span> | <span>{addressDisplay}</span>
        </div>
         {/* Display phone number */}
         {props.clientPhone && <div className="fc-event-phone">{props.clientPhone}</div>}
      </div>
    );
  };

  // --- Refresh Handler --- 
  const handleRefresh = useCallback(() => {
    console.log("[OnSiteBooking] Refresh clicked");
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const currentView = calendarApi.view;
      // Fetch both teams and appointments on manual refresh
      setLoading(true);
       Promise.all([
           teamService.fetchTeams(),
           // Fetch appointments for the current view
           appointmentService.getAppointments({
               start_gte: moment(currentView.activeStart).toISOString(),
               start_lte: moment(currentView.activeEnd).toISOString(),
               booking_type: 'on-site' // Explicitly include booking type filter
           })
       ]).then(([refreshedTeams, appointmentsResponse]) => {
           setTeams(refreshedTeams || []);
           const fetchedAppointments = appointmentsResponse?.data || [];
           // Remap events with the refreshed teams
           const events = fetchedAppointments.map(appointment => {
                const service = services.find(s => s.id === appointment.serviceId);
                // Use the JUST fetched teams
                const team = (refreshedTeams || []).find(t => t.id === appointment.teamId);
                const eventColor = team?.colour || service?.colour || '#adb5bd';
                return {
                    id: appointment.id,
                    title: appointment.clientName || appointment.title || 'On-site Visit',
                    start: new Date(appointment.start),
                    end: new Date(appointment.end),
                    serviceId: appointment.serviceId,
                    teamId: appointment.teamId,
                    clientName: appointment.clientName,
                    clientPhone: appointment.clientPhone,
                    address: { 
                      line1: appointment.address?.line1, 
                      line2: appointment.address?.line2, 
                      city: appointment.address?.city, 
                      postalCode: appointment.address?.postalCode, 
                      country: appointment.address?.country 
                    },
                    status: appointment.status,
                    extendedProps: {
                        service: service || { name: 'Unknown Service', colour: '#CCCCCC' },
                        team: team || { name: 'Unassigned Team', id: appointment.teamId },
                        address_line1: appointment.address?.line1, 
                        address_line2: appointment.address?.line2, 
                        city: appointment.address?.city, 
                        postal_code: appointment.address?.postalCode, 
                        country: appointment.address?.country,
                        clientName: appointment.clientName, 
                        clientPhone: appointment.clientPhone, 
                        status: appointment.status,
                        serviceId: appointment.serviceId, 
                        teamId: appointment.teamId,
                    },
                    backgroundColor: eventColor, borderColor: eventColor
                };
           });
           setAppointments(events);
           toast.info("Calendar refreshed.");
       }).catch(err => {
           console.error("[OnSiteBooking] Refresh failed:", err);
           toast.error("Failed to refresh calendar data.");
       }).finally(() => {
            setLoading(false);
       });

    } else {
        // Fallback if calendarRef isn't available
        fetchOnSiteData();
    }
}, [fetchOnSiteData, services]); // Add services dependency
  
  // Calendar Did Mount Handler (Can be kept as is)
  const handleCalendarDidMount = useCallback(() => {
      // ... (optional initialization) ...
  }, []);

  // --- Format Teams for react-select ---
  useEffect(() => {
    if (teams && teams.length > 0) {
      const options = teams.map(team => ({
        value: team.id,
        label: team.name
      }));
      setTeamOptions(options);
    }
  }, [teams]);

  const handleAddressChange = useCallback((newAddress) => {
    setAddress(prev => ({ ...prev, ...newAddress }));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (!selectedSlot || !selectedSlot.start || !selectedSlot.end) {
      toast.error("Invalid time slot selected.");
      setIsSubmitting(false);
      return;
    }

    if (!selectedTeam) {
      toast.error("Please select a team.");
      setIsSubmitting(false);
      return;
    }

    const bookingData = {
      clientName,
      contactNumber,
      serviceId: selectedSlot.serviceId,
      teamId: selectedTeam.value,
      start: selectedSlot.start.toISOString(),
      end: selectedSlot.end.toISOString(),
      address,
      notes,
      bookingType: 'on-site'
    };

    console.log('Submitting on-site booking:', bookingData);

    try {
      const response = await axiosInstance.post('/appointments', bookingData);
      console.log('Booking successful:', response.data);
      toast.success('On-site appointment booked successfully!');
      // Assuming onBookingSuccess is called elsewhere in the component
    } catch (error) {
      console.error('Booking failed:', error.response?.data || error);
      toast.error(`Booking failed: ${error.response?.data?.message || 'Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render Logic --- 
  if (!initialBookingConfigLoaded && loading) {
    return <div className="loading">Loading On-Site Bookings...</div>;
  }
  if (error && appointments.length === 0) { // Show error only if no appointments loaded
    return <div className="error">{error}</div>;
  }

  return (
    // Use a different container class if needed for specific OnSite styling
    <div className="on-site-booking-container booking-config-container">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="booking-header">
        <h2>On-Site Appointment Calendar</h2>
        <div className="header-controls">
          {loading && <LoadingSpinner />} 
          {/* Removed stats toggle button */}
          {/* Service Settings Button - Decide if needed for OnSite */}
          {/* <button 
            className="service-settings-button btn btn-secondary me-2"
            onClick={handleOpenServiceSettingsModal}
            disabled={loading} 
            title="Service Settings"
          >
            <FaCog />
          </button> */} 
          <button 
            className="team-settings-button btn btn-secondary me-2"
            onClick={handleOpenTeamSettingsModal}
            disabled={loading}
            title="Manage Teams"
          >
            <FaUsers />
          </button>
          <button 
            className="refresh-button btn btn-primary"
            onClick={handleRefresh} 
            disabled={loading} 
            title="Refresh Calendar"
          >
            <FaSyncAlt/> {/* Use Refresh icon */}
          </button>
        </div>
      </div>
      
      {/* Removed source filters */}
      
      {!loading && error && <div className="error-message">{error}</div>}
      
      {/* TODO: Add Map component area here later */} 

      <div className="calendar-wrapper">
        {loading && <div className="calendar-loading-overlay"><LoadingSpinner/></div>}
        <div className={`calendar-container ${loading ? 'loading' : ''}`}> 
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, momentPlugin, scrollGridPlugin]}
              initialView={viewType}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              events={appointments} // Use the main appointments state
              selectable={true}
              selectMirror={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              eventContent={renderEventContent}
              nowIndicator={true}
              height="auto"
              timeZone='local'
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
              expandRows={true}
              dayMinWidth={100}
              stickyHeaderDates={true}
              handleWindowResize={true} 
              displayEventTime={true}
              displayEventEnd={true}
              firstDay={1}
              businessHours={{
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                startTime: '09:00',
                endTime: '18:00',
              }}
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              }}
              viewDidMount={handleCalendarDidMount}
              eventMinWidth={80}
              eventOverlap={true} // Keep default overlap visually, logic handles backend
              eventMinHeight={60}
              eventMaxStack={2}
              slotDuration={"00:30:00"}
              contentHeight="auto"
              aspectRatio={1.8}
            />
        </div>
      </div>
      
      {/* Modals */} 
      {isModalOpen && (
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
        services={services} // Pass services
        teams={teams} // <-- Pass teams to modal
        isOnSite={true} // <-- Add flag to indicate OnSite mode
        selectedSlot={selectedSlot}
        appointmentToEdit={appointmentToEdit} 
        editMode={editMode}
        />
      )}

      {showConflictModal && conflictData && (
        <ConflictModal 
          show={showConflictModal}
          onHide={handleCloseConflictModal}
          onForce={handleForceSubmit}
          conflictData={conflictData}
        />
      )}

      {/* Team Settings Modal */}
      {showTeamSettingsModal && (
          <TeamSettingsModal
            isOpen={showTeamSettingsModal}
            onClose={handleCloseTeamSettingsModal}
            onTeamsUpdate={handleTeamsUpdated} // <-- Pass the callback
          />
      )}

      <form onSubmit={handleSubmit} className="on-site-booking-form">
        <h4>Book On-Site Appointment</h4>
        {selectedSlot && (
          <p>Time Slot: {selectedSlot.start.toLocaleString()} - {selectedSlot.end.toLocaleString()}</p>
        )}
        
        <div className="mb-3">
          <label htmlFor="clientNameOnSite" className="form-label">Client Name *</label>
          <input 
            type="text" 
            className="form-control" 
            id="clientNameOnSite"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required 
            disabled={isSubmitting}
          />
        </div>
        
        <div className="mb-3">
          <label htmlFor="contactNumberOnSite" className="form-label">Contact Number</label>
          <input 
            type="tel" 
            className="form-control" 
            id="contactNumberOnSite"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="mb-3">
            <label htmlFor="teamSelectOnSite" className="form-label">Assign Team *</label>
            <Select 
                id="teamSelectOnSite"
                options={teamOptions}
                value={selectedTeam}
                onChange={setSelectedTeam}
                placeholder="Select a team..."
                isDisabled={isSubmitting || teamOptions.length === 0}
                isClearable
                required
            />
            {teamOptions.length === 0 && <small className="text-muted">No teams available for this service/time.</small>}
        </div>
        
        {/* Address Input Component */}
        <AddressInput address={address} onAddressChange={handleAddressChange} disabled={isSubmitting} />
        
        <div className="mb-3">
          <label htmlFor="notesOnSite" className="form-label">Notes</label>
          <textarea 
            className="form-control" 
            id="notesOnSite"
            rows="3"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
          ></textarea>
        </div>
        
        <div className="d-flex justify-content-end">
          <button type="button" className="btn btn-secondary me-2" onClick={handleCloseModal} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedTeam}>
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Removed propTypes and defaultProps as agentType is removed

export default OnSiteBooking; 