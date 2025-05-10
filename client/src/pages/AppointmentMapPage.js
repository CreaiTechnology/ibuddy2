import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaUsers, FaMapMarkedAlt, FaRoute, FaPrint } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppointmentMap from '../components/map/AppointmentMap';
// import * as appointmentService from '../services/appointmentService'; // Removed as it's unused
import { fetchTeams } from '../services/teamService';
import api from '../api/axiosInstance';
import './AppointmentMapPage.css';
import moment from 'moment';
import { useFeatureGuard } from '../hooks/useFeatureGuard';

// Helper function to validate date objects
const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date.getTime());
};

// Helper function to safely convert to ISO string
const safeISOString = (date) => {
  if (!date || !isValidDate(date)) {
    console.warn('Invalid date detected:', date);
    // Return a valid date as fallback (current date)
    return new Date().toISOString();
  }
  return date.toISOString();
};

// Safely create Date objects
const safeCreateDate = (value) => {
  if (!value) {
    console.warn('Received null value when creating date');
    return new Date(); // Return current date as fallback
  }
  
  try {
    const date = new Date(value);
    if (!isValidDate(date)) {
      console.warn('Created invalid date:', value);
      return new Date(); // Return current date as fallback
    }
    return date;
  } catch (err) {
    console.error('Error creating date:', err);
    return new Date(); // Return current date as fallback
  }
};

const AppointmentMapPage = () => {
  useFeatureGuard('proA');
  const [allAppointments, setAllAppointments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(new Date().setDate(new Date().getDate() + 7))
  });

  // Load map-specific appointment data from the new backend endpoint
  useEffect(() => {
    const fetchMapAppointments = async () => {
      setLoading(true);
      setError('');
      
      try {
        // Prepare query parameters for the new endpoint
        const params = {
          start_gte: safeISOString(dateRange.start),
          start_lte: safeISOString(dateRange.end),
          // Only add team_id if it's not 'all'
          ...(selectedTeamId !== 'all' && { team_id: selectedTeamId })
        };
        
        console.log('[MapPage] Fetching map appointments with params:', params);
        
        // Call the new API endpoint directly using axiosInstance
        const response = await api.get('/appointments/map-data', { params });
        
        console.log('[MapPage] Fetched map appointments result:', response.data);
        
        // Backend now returns the transformed data directly
        setAllAppointments(response.data || []);
        
        // Extract unique teams from the fetched data (if teams haven't been loaded yet)
        if (loadingTeams && response.data && response.data.length > 0) {
          const teamsFromAppointments = extractTeamsFromAppointments(response.data);
          if (teamsFromAppointments.length > 0) {
            console.log('[MapPage] Extracted teams from map appointments:', teamsFromAppointments);
            setTeams(teamsFromAppointments);
            setLoadingTeams(false);
          } else {
            loadTeamsFromAPI(); // Fallback if no teams in appointments
          }
        } else if (loadingTeams) {
           loadTeamsFromAPI(); // Fallback if no appointments or teams already loading/loaded
        }

      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || 'Error loading map appointment data';
        console.error('Error fetching map appointments:', error);
        setError(errorMsg);
        toast.error('Unable to load map appointment data, please try again later');
        // Still try to load teams even if appointments fail
        if (loadingTeams) loadTeamsFromAPI();
      } finally {
        setLoading(false);
      }
    };

    fetchMapAppointments();
  // Dependency array now includes selectedTeamId to refetch when team changes
  }, [dateRange, selectedTeamId, loadingTeams]); 
  
  // Extract unique teams from the transformed appointment data
  const extractTeamsFromAppointments = (appointments) => {
    const teamMap = new Map();
    appointments.forEach(appointment => {
      const teamId = appointment.extendedProps?.teamId;
      if (!teamId) return; 
      
      if (!teamMap.has(teamId)) {
        teamMap.set(teamId, {
          id: teamId,
          name: appointment.extendedProps?.teamName || `Team ${teamId}`,
          colour: appointment.extendedProps?.teamColour || '#cccccc'
        });
      }
    });
    return Array.from(teamMap.values());
  };
  
  // Load teams from API (remains mostly the same, used as fallback)
  const loadTeamsFromAPI = async () => {
    try {
      setLoadingTeams(true);
      const fetchedTeams = await fetchTeams();
      if (fetchedTeams && fetchedTeams.length > 0) {
        setTeams(fetchedTeams);
      } else {
        console.log('[AppointmentMapPage] No team data available from API');
      }
    } catch (err) {
      console.error('[AppointmentMapPage] Error fetching team data:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Filter appointments by selected team (this logic might be redundant now as fetching is filtered, but kept for consistency/UI filtering if needed)
  // Or simply rename allAppointments to filteredAppointments if backend does all filtering
  // Let's keep it for now, as it doesn't hurt and uses the already fetched data.
  const filteredAppointments = useMemo(() => {
    // If filtering happens on backend based on selectedTeamId, 
    // allAppointments already *is* the filtered list.
    // However, keeping the filter logic here allows potential client-side "All Teams" view
    // without refetching if we fetch all initially and then filter.
    // Given the useEffect dependency now includes selectedTeamId, 
    // it *will* refetch when team changes. So this memo is less critical for performance,
    // but correctly filters the current state.
     if (selectedTeamId === 'all') {
       return allAppointments; // Assumes allAppointments contains all teams if selectedTeamId was 'all' during fetch
     }
     return allAppointments.filter(app => {
       const appointmentTeamId = app.extendedProps?.teamId;
       return String(appointmentTeamId) === String(selectedTeamId);
     });
    // If backend *always* filters by selectedTeamId (even for 'all'), then this useMemo is not needed
    // and you can directly use `allAppointments` where `filteredAppointments` was used.
    // Let's assume the fetch refetches on team change for now.
  }, [allAppointments, selectedTeamId]);

  // Log count before and after filtering, to help with debugging
  useEffect(() => {
    console.log(`[MapPage] Team filtering: Filtered ${filteredAppointments.length} appointments from ${allAppointments.length}`);
  }, [allAppointments.length, filteredAppointments.length]);

  // Handle date range changes with validation
  const handleDateRangeChange = (type, value) => {
    try {
      if (!value) {
        console.warn(`Date input is empty, type: ${type}`);
        toast.error('Date cannot be empty');
        return;
      }
      
      // Create date object and validate
      const newDate = safeCreateDate(value);
      
      setDateRange(prev => {
        // Ensure start date is not after end date, and end date is not before start date
        if (type === 'start' && prev.end && newDate > prev.end) {
          toast.warn('Start date cannot be later than end date');
          return prev;
        }
        
        if (type === 'end' && prev.start && newDate < prev.start) {
          toast.warn('End date cannot be earlier than start date');
          return prev;
        }
        
        return {
          ...prev,
          [type]: newDate
        };
      });
    } catch (err) {
      console.error('Error parsing date:', err);
      toast.error('Invalid date format');
    }
  };

  // Handle team selection changes - Now triggers refetch via useEffect dependency
  const handleTeamChange = (event) => {
    const newTeamId = event.target.value;
    console.log(`[MapPage] Team selection changed: ${selectedTeamId} -> ${newTeamId}`);
    setSelectedTeamId(newTeamId); // Update state, useEffect will handle refetching
  };

  // Handle appointment selection
  const handleAppointmentSelect = (appointment) => {
    console.log('Selected appointment:', appointment);
  };

  // Safely format dates for inputs and display
  const formatDateForInput = (date) => {
    if (!date || !isValidDate(date)) {
      console.warn('Invalid date detected when formatting for input:', date);
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  };
  
  const formatDateForDisplay = (date) => {
    if (!date || !isValidDate(date)) {
      console.warn('Invalid date detected when formatting for display:', date);
      return new Date().toLocaleDateString();
    }
    return date.toLocaleDateString();
  };

  // 添加打印预约信息的函数
  const handlePrintAppointments = () => {
    const printContent = filteredAppointments.map(appt => {
      const props = appt.extendedProps || {};
      const formattedDate = moment(appt.start).format('YYYY-MM-DD');
      const formattedTime = moment(appt.start).format('HH:mm');
      const address = props.formattedAddress || 'No address';
      
      return `
        <div class="print-appointment">
          <h3>${props.clientName || 'Unnamed Client'}</h3>
          <p><strong>Date:</strong> ${formattedDate}</p>
          <p><strong>Time:</strong> ${formattedTime}</p>
          <p><strong>Service:</strong> ${props.serviceName || 'N/A'}</p>
          <p><strong>Team:</strong> ${props.teamName || 'N/A'}</p>
          <p><strong>Address:</strong> ${address}</p>
          <p><strong>Contact:</strong> ${props.phoneNumber || 'N/A'}</p>
          <p><strong>Status:</strong> ${props.status || 'N/A'}</p>
        </div>
      `;
    }).join('<hr />');

    // 创建打印窗口
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Appointment List</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
            }
            h1 {
              text-align: center;
              margin-bottom: 20px;
            }
            .print-header {
              margin-bottom: 30px;
            }
            .print-appointment {
              margin-bottom: 15px;
              page-break-inside: avoid;
            }
            hr {
              border: none;
              border-top: 1px dashed #ccc;
              margin: 20px 0;
            }
            p {
              margin: 5px 0;
            }
            .print-footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #777;
            }
            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <button onClick="window.print();" style="position: fixed; top: 20px; right: 20px; padding: 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Print This Page
          </button>
          
          <div class="print-header">
            <h1>Appointment List</h1>
            <p><strong>Date Range:</strong> ${formatDateForDisplay(dateRange.start)} to ${formatDateForDisplay(dateRange.end)}</p>
            <p><strong>Team:</strong> ${selectedTeamId === 'all' ? 'All Teams' : (teams.find(t => String(t.id) === String(selectedTeamId))?.name || 'Unknown Team')}</p>
            <p><strong>Total Appointments:</strong> ${filteredAppointments.length}</p>
          </div>
          
          ${printContent}
          
          <div class="print-footer">
            <p>Printed on: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="appointment-map-page">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className="map-page-header">
        <div className="map-page-title">
          <h2><FaMapMarkedAlt /> Appointment Map View</h2>
          <p>View and plan on-site appointment routes (using Leaflet & OpenStreetMap)</p>
        </div>
        
        <div className="map-page-actions">
          <Link to="/dashboard/configure/onsite-booking" className="back-to-calendar">
            <FaArrowLeft /> Back to Calendar View
          </Link>
        </div>
      </div>
      
      <div className="map-filters-container">
        <div className="map-date-filter">
          <div className="date-filter-group">
            <label htmlFor="start-date">Start Date:</label>
            <input 
              type="date" 
              id="start-date"
              value={formatDateForInput(dateRange.start)}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
            />
          </div>
          <div className="date-filter-group">
            <label htmlFor="end-date">End Date:</label>
            <input 
              type="date" 
              id="end-date"
              value={formatDateForInput(dateRange.end)}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
            />
          </div>
        </div>

        <div className="map-team-filter">
          <FaUsers />
          <label htmlFor="team-select">Select Team:</label>
          <select 
            id="team-select" 
            value={selectedTeamId}
            onChange={handleTeamChange}
            disabled={loadingTeams}
          >
            <option value="all">All Teams</option>
            {loadingTeams && <option disabled>Loading...</option>}
            {!loadingTeams && teams.length === 0 && (
              <option disabled>No teams available</option>
            )}
            {!loadingTeams && teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        <button 
          className="print-button" 
          onClick={handlePrintAppointments} 
          disabled={loading || filteredAppointments.length === 0}
        >
          <FaPrint /> Print Appointment List
        </button>
      </div>
      
      {loading ? (
        <div className="map-loading-container">
          <div className="map-loading-spinner"></div>
          <p>Loading appointment data...</p>
        </div>
      ) : error ? (
        <div className="map-error-container">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : (
        <div className="map-container">
          <AppointmentMap 
            appointments={filteredAppointments} 
            onAppointmentSelect={handleAppointmentSelect}
          />
          
          <div className="map-info-panel">
            <h3>Instructions</h3>
            <ul>
              <li>The left panel shows appointments for the selected team and date range; click to see location on map</li>
              <li>Click markers on the map to view details</li>
              <li>Use the filters above to select date range and team</li>
              <li><FaRoute /> <strong>New Feature: Route Planning</strong> - Click "Plan Route" button to generate the optimal driving route between all appointment points</li>
              <li>Check "Optimize Route" to automatically calculate the shortest path order (recommended)</li>
              <li>Route planning shows total distance and estimated time, helping teams plan their schedule efficiently</li>
            </ul>
            <div className="map-stats">
              <p>Currently Showing: <strong>{filteredAppointments.length}</strong> appointments 
              {selectedTeamId === 'all' 
                ? ' (All Teams)'
                : ` for ${teams.find(t => String(t.id) === String(selectedTeamId))?.name || 'Unknown Team'}`
              }
              {filteredAppointments.length < allAppointments.length && (
                <span className="filtered-count"> (filtered from {allAppointments.length} total)</span>
              )}
              </p>
              <p>Date Range: <strong>{formatDateForDisplay(dateRange.start)} to {formatDateForDisplay(dateRange.end)}</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentMapPage; 