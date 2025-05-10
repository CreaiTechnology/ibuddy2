import axiosInstance from '../api/axiosInstance'; // Corrected import path
import moment from 'moment';

// Remove the hardcoded base URL
// const API_BASE_URL = 'http://localhost:5000/api';

// Normalize appointment data from backend for client use
const normalizeAppointment = (appointment) => {
  // Extract necessary details from the raw appointment object
  const props = {
    service_id_old_uuid: appointment.service_id_old_uuid, // Keep original PK if needed
    serviceId: appointment.service_id, // Keep numeric FK
    teamId: appointment.team_id,
    bookingType: appointment.booking_type,
    clientName: appointment.clientName || '',
    contactNumber: appointment.clientPhone || '', // Use 'contactNumber' to match modal state
    status: appointment.status || 'confirmed',
    notes: appointment.notes || '', // --- 添加 notes ---
    source: appointment.source || 'other', // --- 添加 source ---
    address: { // --- 保持 address 结构 ---
        line1: appointment.address_line1 || '',
        line2: appointment.address_line2 || '',
        city: appointment.city || '',
        postalCode: appointment.postal_code || '',
        country: appointment.country || ''
    },
    teamName: appointment.team?.name,
    teamColour: appointment.team?.colour,
    serviceName: appointment.service?.name,
    serviceColour: appointment.service?.colour
  };

  // Clean up empty address object if all fields are empty
  // Check if props.address exists before cleaning
  if (props.address && Object.values(props.address).every(val => !val)) {
      // If you prefer null in the modal instead of undefined, set to null
      // props.address = null; 
      // Otherwise, remove it if the modal handles undefined gracefully
       delete props.address;
  }


  const normalized = {
    // Fields FullCalendar uses directly
    id: appointment.service_id_old_uuid, // Use the unique ID for FullCalendar event ID
    title: props.clientName || 'Untitled Appointment', // Event title shown on calendar
    start: new Date(appointment.start),
    end: new Date(appointment.end),
    allDay: false, // Assuming appointments are not all-day unless specified otherwise
    backgroundColor: props.serviceColour || (props.teamColour || '#3788d8'), // Event background color
    borderColor: props.serviceColour || (props.teamColour || '#3788d8'),     // Event border color
    
    // Also add serviceId at the top level for statistics component
    serviceId: appointment.service_id,
    service_id: appointment.service_id,

    // Put ALL other data needed by the modal or other parts into extendedProps
    extendedProps: props 
  };

  return normalized;
};

/**
 * Fetch appointments with optional filtering
 * @param {Object} filters - Optional filters (start_gte, start_lte, booking_type, service_id, team_id)
 * @returns {Promise<{data: Array, error: Object|null}>} - Object containing data array and error
 */
export const getAppointments = async (filters = {}) => {
  console.log('[appointmentService] Getting appointments with filters:', filters);
  try {
    // 修改 API 路径，添加 /api 前缀
    const response = await axiosInstance.get('/api/appointments', { params: filters });
    // Axios instance handles non-2xx errors
    const normalizedData = response.data.map(appt => normalizeAppointment(appt));
    return { data: normalizedData, error: null };
  } catch (error) {
    console.error('Error fetching appointments:', error.response?.data || error);
    return { data: [], error: error.response?.data || error }; // Return error object
  }
};

/**
 * Create a new appointment (Walk-in or On-site)
 * @param {Object} appointmentData - Appointment data including booking_type, team_id (if on-site), address (if on-site)
 * @returns {Promise<Object>} - The created appointment (normalized) or throws specific error on conflict
 */
export const createAppointment = async (appointmentData) => {
  console.log('[appointmentService] Creating appointment with data:', appointmentData);
  try {
    const apiData = {
      clientName: appointmentData.clientName,
      start: appointmentData.start,
      end: appointmentData.end,
      service_id: appointmentData.serviceId,
      status: appointmentData.status || 'confirmed',
      notes: appointmentData.notes || undefined,
      source: appointmentData.source || undefined,
      clientPhone: appointmentData.contactNumber || undefined,
      booking_type: appointmentData.bookingType,
      force: appointmentData.force || false,
      ...( (appointmentData.bookingType === 'on-site') && {
          team_id: appointmentData.teamId,
          address_line1: appointmentData.address?.line1,
          address_line2: appointmentData.address?.line2,
          city: appointmentData.address?.city,
          postal_code: appointmentData.address?.postalCode,
          country: appointmentData.address?.country
      })
    };
    Object.keys(apiData).forEach(key => apiData[key] === undefined && delete apiData[key]);

    console.log('[appointmentService] Sending data to POST /appointments:', apiData);
    // 修改 API 路径，添加 /api 前缀
    const response = await axiosInstance.post('/api/appointments', apiData);
    
    console.log('[appointmentService] Appointment created, API response status:', response.status);
    const createdAppt = normalizeAppointment(response.data);
    
    if (response.data.overlapWarning) {
      console.log('[appointmentService] Overlap warning received:', response.data.overlapWarning);
      createdAppt.overlapWarning = response.data.overlapWarning;
    }
    return createdAppt;
    
  } catch (error) {
    console.error('Error creating appointment:', error.response?.data || error.message);
    if (error.response?.status === 409 && error.response.data?.isConflict) {
      console.warn('[appointmentService] Conflict detected on create:', error.response.data);
      const conflictError = new Error(error.response.data.message || 'Appointment conflict detected');
      conflictError.isConflict = true;
      conflictError.details = error.response.data.details;
      conflictError.canForce = error.response.data.canForce;
      throw conflictError;
    }
    throw error.response?.data || error;
  }
};

/**
 * Update an existing appointment
 * @param {string} appointmentId - The ID of the appointment to update
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object>} - The updated appointment (normalized)
 */
export const updateAppointment = async (appointmentId, updateData) => {
  console.log(`[appointmentService] Updating appointment ${appointmentId} with data:`, updateData);
  try {
    // Prepare data, ensure dates are in suitable format if updated
    const apiData = { ...updateData }; 
    if (apiData.start) apiData.start = moment(apiData.start).toISOString();
    if (apiData.end) apiData.end = moment(apiData.end).toISOString();
    // Map frontend keys to backend keys if necessary (e.g., serviceId -> service_id)
    if (apiData.serviceId) { apiData.service_id = apiData.serviceId; delete apiData.serviceId; }
    if (apiData.teamId) { apiData.team_id = apiData.teamId; delete apiData.teamId; }
    if (apiData.bookingType) { apiData.booking_type = apiData.bookingType; delete apiData.bookingType; }
    if (apiData.contactNumber) { apiData.clientPhone = apiData.contactNumber; delete apiData.contactNumber; }
    if (apiData.address) { /* Handle address fields mapping */ }

    // 修改 API 路径，添加 /api 前缀
    const response = await axiosInstance.put(`/api/appointments/${appointmentId}`, apiData);
    console.log('Appointment updated successfully:', response.data);
    return normalizeAppointment(response.data);
  } catch (error) {
    console.error(`Error updating appointment ${appointmentId}:`, error.response?.data || error);
    throw error.response?.data || error;
  }
};

/**
 * Delete an appointment
 * @param {string} appointmentId - The ID of the appointment to delete
 * @returns {Promise<void>}
 */
export const deleteAppointment = async (appointmentId) => {
  console.log(`[appointmentService] Deleting appointment ${appointmentId}`);
  try {
    // 修改 API 路径，添加 /api 前缀
    await axiosInstance.delete(`/api/appointments/${appointmentId}`);
    console.log('Appointment deleted successfully.');
  } catch (error) {
    console.error(`Error deleting appointment ${appointmentId}:`, error.response?.data || error);
    throw error.response?.data || error;
  }
};

// Removed fetchAppointmentsBySource as filtering is now in getAppointments

// Removed getAppointmentStats as it's not implemented/used with the new backend structure

// Export all functions
const appointmentService = {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
};

export default appointmentService;