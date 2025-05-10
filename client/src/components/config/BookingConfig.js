import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import './BookingConfig.css'; // Import the CSS file
// Removed react-big-calendar imports
import FullCalendar from '@fullcalendar/react'; // Main FullCalendar component
import dayGridPlugin from '@fullcalendar/daygrid'; // Plugin for dayGrid views (month, day)
import timeGridPlugin from '@fullcalendar/timegrid'; // Plugin for timeGrid views (week, day)
import interactionPlugin from '@fullcalendar/interaction'; // Plugin for selectable, draggable, resizable
import listPlugin from '@fullcalendar/list'; // Plugin for list view
import momentPlugin from '@fullcalendar/moment'; // Plugin for Moment.js integration
import scrollGridPlugin from '@fullcalendar/scrollgrid'; // Plugin for ScrollGrid functionality
import moment from 'moment';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// import axios from 'axios'; // Re-add axios import
import * as appointmentService from '../../services/appointmentService'; // Import the service
import { fetchServices as fetchServicesFromService } from '../../services/serviceService'; // Import the service
import { useLoading } from '../../contexts/LoadingContext'; // Import the context hook
import AppointmentModal from './AppointmentModal';
import ConflictModal from './ConflictModal'; // Import the new modal
import ServiceSettingsModal from './ServiceSettingsModal'; // <-- Import the new modal
import { FaCog, FaChartBar, FaMapMarkedAlt } from 'react-icons/fa'; // <-- 导入图标
import AppointmentStats from '../statistics/AppointmentStats'; // <-- 导入统计组件
import { Link } from 'react-router-dom'; // 导入Link组件

// Simple spinner component or just text
const LoadingSpinner = () => <div className="loading-spinner">Loading...</div>;

// Define the base URL for the API
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000'; // Use env var or default

function BookingConfig({ agentType = 'walkin' }) { 
  // --- DEBUGGING: Log received agentType prop ---
  console.log('[BookingConfig] Received agentType prop:', agentType, '(Type:', typeof agentType, ')');
  // ---------------------------------------------
  
  // Local loading state for specific actions (like refresh, save, delete)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [services, setServices] = useState([]); // Start with empty, fetch from API

  const [appointments, setAppointments] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // Adapting this for FullCalendar's select callback
  const [editMode, setEditMode] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  
  // Get state and setter from LoadingContext
  const { initialBookingConfigLoaded } = useLoading();

  // Ref for FullCalendar API access
  const calendarRef = useRef(null);
  
  const [sourceFilters, setSourceFilters] = useState({
    walkin: true,
    whatsapp: true,
    messenger: true,
    instagram: true,
    other: true
  });
  
  // Keep viewType state, but remove the setter as it's unused
  const [viewType] = useState('timeGridWeek');
  
  // --- NEW State for Conflict Handling ---
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState(null); // { details: {...}, originalData: {...}, isEdit: boolean, canForce: boolean }
  // ----------------------------------------
  const [showServiceSettingsModal, setShowServiceSettingsModal] = useState(false); // <-- State for new modal
  
  // --- 新增状态：控制统计视图的显示 --- 
  const [showStats, setShowStats] = useState(false);
  // -------------------------------------
  
  // Fetch appointments from backend
  const fetchAppointments = useCallback(async (dateRange = null) => {
    // setLoading(true); // REMOVED: Let useEffect handle loading state
    // setError(null); // REMOVED: Let useEffect handle error state initialization
    
    try {
      const filters = {};
      if (dateRange) {
        filters.start_gte = moment(dateRange.start).toISOString();
        filters.start_lte = moment(dateRange.end).toISOString();
      }
      
      // Filter based on the agentType prop
      if (agentType) {
        filters.booking_type = agentType; // Use the prop value
      } else {
        // Fallback or error handling if agentType is missing?
        console.warn('agentType prop is missing, fetching may include all types or fail.');
        // filters.booking_type = 'walk-in'; // Or default to walk-in if preferred
      }

      console.log('Fetching appointments with filters:', filters);
      
      // Use the appointmentService instead of direct axios call
      const result = await appointmentService.getAppointments(filters);
      console.log('Fetched appointments response:', result.data);

      if (result.error) {
        throw result.error;
      }

      // Use the normalized data from the service
      setAppointments(result.data);
      // setLoading(false); // REMOVED: Let useEffect handle loading state
      return result.data; // Return data on success for the useEffect chain
    } catch (error) {
      console.error('Failed to fetch appointments:', error.response || error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to load appointments";
      // setError(errorMsg); // Let useEffect handle setting the main error
      // setLoading(false); // REMOVED: Let useEffect handle loading state
      toast.error(errorMsg); // Keep toast for immediate feedback
      throw error; // Re-throw error so useEffect catch block can handle it
    }
  }, [agentType]); // Add agentType to dependency array

  // Handle datesSet - Fetches appointments based on calendar view date range
  const handleDatesSet = useCallback((dateInfo) => {
    console.log("FullCalendar datesSet (BookingConfig):", dateInfo);
    if (!loading) {
      const dateRange = { start: dateInfo.start, end: dateInfo.end };
      console.log("Loading appointments for date range:", dateRange);
      fetchAppointments(dateRange);
    }
  }, [fetchAppointments, loading]);

  // Effect for data loading on mount and when agentType changes
  useEffect(() => {
    // Removed the check for initialBookingConfigLoaded 
    console.log(`Performing data load for agentType: ${agentType}...`);
    setError(''); // Clear previous errors
    setLoading(true); // Set loading for fetch

    // Fetch services (assuming services are common, could optimize later)
    fetchServicesFromService()
      .then((normalizedServices) => { 
        console.log('[useEffect] fetchServicesFromService resolved. Received data:', normalizedServices);
        setServices(normalizedServices || []);
        console.log('[useEffect] State updated with services. Fetching initial appointments for', agentType);
        
        // Fetch appointments for the current view's date range or a default range
        let dateRangeToFetch = null;
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            const currentView = calendarApi.view;
            dateRangeToFetch = { start: currentView.activeStart, end: currentView.activeEnd };
        } else {
            // Default range if calendar not yet mounted (e.g., first load)
            const today = new Date();
            const startOfWeek = moment(today).startOf('isoWeek').toDate(); 
            const endOfWeek = moment(today).endOf('isoWeek').toDate();   
            dateRangeToFetch = { start: startOfWeek, end: endOfWeek };
        }
        
        return fetchAppointments(dateRangeToFetch);
      })
      .then(() => {
        console.log(`Appointments for ${agentType} loaded successfully`);
        setLoading(false); // Set loading to false here on overall success
      })
      .catch((err) => {
        console.error(`Data load process for ${agentType} failed:`, err);
        // Set error based on where the failure occurred
        if (err.message && err.message.includes('fetch services')) {
           setError("Failed to load essential service data.");
        } else {
            // Error likely came from fetchAppointments (or service fetch promise handling)
            setError(err.response?.data?.message || err.message || "Failed to load appointments");
        } 
        setLoading(false); // Set loading to false here on any error in the chain
      });
      
  }, [agentType, fetchAppointments]); // Keep dependencies

  // Filtered appointments based on source filters
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
       // Access source from extendedProps where we put it now
      const source = appointment.extendedProps?.source; 
      if (!source) {
        // If source is missing or falsy, check if 'other' filter is enabled
        return sourceFilters.other;
      }
      // Check if the filter for the specific source is enabled (case-insensitive)
      return sourceFilters[source.toLowerCase()] !== false;
    });
  }, [appointments, sourceFilters]);
  
  // Toggle source filter
  const toggleSourceFilter = (source) => {
    setSourceFilters(prev => ({
      ...prev,
      [source]: !prev[source]
    }));
  };

  // --- FullCalendar Interaction Handlers ---
  // Replaced handleSelectSlot with handleDateSelect for FullCalendar
  const handleDateSelect = useCallback((selectInfo) => {
    // selectInfo contains start, end, startStr, endStr, allDay, jsEvent, view, resource
    if (moment(selectInfo.start).isBefore(moment().subtract(1, 'minute'))) { // Allow selection very close to now
      toast.error("Cannot create appointments in the past");
      selectInfo.view.calendar.unselect(); // Unselect the slot visually
      return;
    }
    
    console.log("FullCalendar selected slot:", selectInfo);
    // Adapt selectInfo to the structure expected by AppointmentModal (if needed)
    // Or update AppointmentModal to accept FullCalendar's selectInfo structure
    setSelectedSlot({
        start: selectInfo.start, // Date object
        end: selectInfo.end,     // Date object
        allDay: selectInfo.allDay 
    });
    setEditMode(false); 
    setAppointmentToEdit(null);
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

  // --- Handlers for Service Settings Modal ---
  const handleOpenServiceSettingsModal = useCallback(() => {
    setShowServiceSettingsModal(true);
  }, []);

  const handleCloseServiceSettingsModal = useCallback(() => {
    setShowServiceSettingsModal(false);
    // Optionally refetch services in BookingConfig if changes in modal might affect it?
    // fetchServices(); 
  }, []);
  // -----------------------------------------

  // Save appointment (Create or Update) using the service
  const handleSaveAppointment = useCallback(async (appointmentDataFromModal) => {
    // --- 添加日志 ---
    console.log('[BookingConfig] handleSaveAppointment received:', JSON.stringify(appointmentDataFromModal));
    // ---------------
    const isEdit = editMode;
    const appointmentId = isEdit ? (appointmentToEdit.id || appointmentToEdit._id) : null;

    // Add booking_type if it's not already there (belt and suspenders)
    const dataToSend = {
        ...appointmentDataFromModal,
        bookingType: appointmentDataFromModal.bookingType || agentType // Ensure bookingType is present
    };
    // --- 再加一个日志，看 dataToSend ---
     console.log(`[BookingConfig] Attempting to ${isEdit ? 'update' : 'create'} appointment. ID: ${appointmentId}. Data being prepared:`, JSON.stringify(dataToSend));
     // -------------------------------------

    // setLoading(true); // REMOVED: Moved loading inside try block for better error handling
    // setError(''); 

    // Refetch function defined inside useCallback or passed as dependency
    const refetchCurrentView = () => {
      if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          const currentView = calendarApi.view;
          fetchAppointments({ start: currentView.activeStart, end: currentView.activeEnd });
      }
    };

    // --- 检查冲突逻辑 ---
    const performSave = async (forceSave = false) => {
      setLoading(true); // Set loading before API call
      setError('');
      try {
        let savedAppointment;
        const finalDataToSend = { ...dataToSend, force: forceSave }; // Add force flag here

        if (isEdit) {
            console.log('[BookingConfig] Calling updateAppointment with finalDataToSend:', JSON.stringify(finalDataToSend));
            savedAppointment = await appointmentService.updateAppointment(appointmentId, finalDataToSend);
            toast.success('Appointment updated successfully!');
        } else {
            console.log('[BookingConfig] Calling createAppointment with finalDataToSend:', JSON.stringify(finalDataToSend));
            savedAppointment = await appointmentService.createAppointment(finalDataToSend);
            toast.success('Appointment created successfully!');
        }

        console.log('[BookingConfig] Save successful. Response:', savedAppointment);
        
        // Handle potential overlap warning from backend
        if (savedAppointment.overlapWarning) {
            toast.warn(savedAppointment.overlapWarning, { autoClose: 10000 });
        }
        
        handleCloseModal();
        refetchCurrentView(); // Refetch appointments for the current view
        
      } catch (error) {
          console.error('[BookingConfig] Error saving appointment:', error);
          // No need to check for conflict here again, it's handled before calling performSave
          const errorMsg = error.response?.data?.message || error.message || "Failed to save appointment";
          setError(errorMsg); // Display error to user via state if needed
          toast.error(`Save failed: ${errorMsg}`);
      } finally {
          setLoading(false); // Ensure loading is turned off
      }
    };

    // Initial check for conflict (only when creating or if relevant for update)
    // No need to check if editMode is false and we are just creating
    // Let's assume create checks happen first via the service call attempt
    try {
        setLoading(true); // Start loading before the initial attempt
        setError('');
        let initialCheckResponse;
        if (isEdit) {
            console.log('[BookingConfig] Performing initial UPDATE check (without force):', JSON.stringify(dataToSend));
            initialCheckResponse = await appointmentService.updateAppointment(appointmentId, { ...dataToSend, force: false });
            toast.success('Appointment updated successfully!');
        } else {
            console.log('[BookingConfig] Performing initial CREATE check (without force):', JSON.stringify(dataToSend));
            initialCheckResponse = await appointmentService.createAppointment({ ...dataToSend, force: false });
            toast.success('Appointment created successfully!');
        }
        
        // If initial check succeeds without conflict error
        console.log('[BookingConfig] Initial save check successful:', initialCheckResponse);
         if (initialCheckResponse.overlapWarning) {
            toast.warn(initialCheckResponse.overlapWarning, { autoClose: 10000 });
        }
        handleCloseModal();
        refetchCurrentView();
        setLoading(false); 

    } catch (error) {
        if (error.isConflict) {
            console.warn('[BookingConfig] Conflict detected by service:', error.details);
            // Show conflict modal
            setConflictData({
                details: error.details,
                originalData: dataToSend, // Pass the data that caused the conflict
                isEdit: isEdit,
                canForce: error.canForce,
                onConfirm: () => performSave(true), // Pass callback to save with force=true
                onCancel: handleCloseConflictModal
            });
            setShowConflictModal(true);
            setLoading(false); // Stop loading while modal is shown
        } else {
            // Handle other errors (non-conflict)
            console.error('[BookingConfig] Non-conflict error during initial save check:', error);
            const errorMsg = error.response?.data?.message || error.message || "Failed to save appointment";
            setError(errorMsg);
            toast.error(`Save failed: ${errorMsg}`);
            setLoading(false); // Stop loading on error
        }
    }
    // --- End Conflict Handling ---

  }, [editMode, appointmentToEdit, agentType, handleCloseModal, handleCloseConflictModal, fetchAppointments]); // Added fetchAppointments dependency

  // --- NEW Function for Force Submit ---
  const handleForceSubmit = useCallback(async () => {
    if (!conflictData) return;

    setLoading(true);
    setShowConflictModal(false); // Close conflict modal immediately

    const { originalData, isEdit, appointmentId } = conflictData;
    const forceData = { 
      ...originalData, 
      force: true,
      bookingType: agentType // Use the agentType prop here too for forced submissions
    }; // Add force flag

    try {
      let savedAppointment;
      if (isEdit && appointmentId) {
        console.log(`Forcing update for appointment ${appointmentId}...`);
        savedAppointment = await appointmentService.updateAppointment(appointmentId, forceData);
        toast.warning('Appointment updated with overlap (forced).');
      } else {
        console.log('Forcing creation of new appointment...');
        savedAppointment = await appointmentService.createAppointment(forceData);
        toast.warning('Appointment created with overlap (forced).');
      }
      
      console.log('Forced save successful:', savedAppointment);
      setConflictData(null); // Clear conflict data
      fetchAppointments(); // Refresh calendar

    } catch (error) {
        // Handle errors during force submit (should be rare if backend logic is correct)
        console.error('Error during force submit:', error);
        const errorMsg = error.response?.data?.message || error.message || "Failed to force save appointment";
        setError(errorMsg);
        toast.error(`Force Save Error: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [conflictData, fetchAppointments, agentType]); // Add dependencies
  // ------------------------------------

  // Delete appointment from backend
  const handleDeleteAppointment = useCallback(async (appointmentId) => {
    if (!editMode || !appointmentToEdit || appointmentId !== appointmentToEdit.id) return;
    
    setLoading(true); // Indicate loading state
    try {
      console.log(`Deleting appointment ${appointmentId}...`);
      await appointmentService.deleteAppointment(appointmentId);
      console.log('Delete successful');
      
      // Remove appointment from local state
      setAppointments(prev => 
        prev.filter(appointment => appointment.id !== appointmentId)
      );
      toast.success('Appointment deleted successfully');
      handleCloseModal(); // Close modal after successful deletion

    } catch (error) {
      console.error('Failed to delete appointment:', error.response || error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to delete appointment";
      toast.error(errorMsg + ", please try again later.");
    } finally {
       setLoading(false); // Turn off loading state
    }
  }, [editMode, appointmentToEdit, handleCloseModal]);

  // Replaced handleSelectEvent with handleEventClick for FullCalendar
  const handleEventClick = useCallback((clickInfo) => {
    const event = clickInfo.event;
    // --- 日志：查看 FullCalendar 传递的原始事件对象 ---
    console.log('[BookingConfig] handleEventClick triggered. Raw FullCalendar event:', event);
    // --- 日志：查看 extendedProps 的具体内容 ---
    console.log('[BookingConfig] Event extendedProps content:', JSON.stringify(event.extendedProps, null, 2)); 
    // ---------------------------------------------

    // 假设 extendedProps 包含了 normalizeAppointment 放入的所有数据
    const appointmentDetails = event.extendedProps || {}; 

    // 构建传递给 AppointmentModal 的数据对象
    // 确保这里的字段名与 AppointmentModal 的 useEffect 中使用的 props 字段名一致
    const appointmentToEditData = {
        id: event.id, // 使用 FullCalendar 事件的 ID
        start: event.start, // Date 对象
        end: event.end,     // Date 对象
        allDay: event.allDay,

        // 从 extendedProps 获取数据
        clientName: appointmentDetails.clientName,
        serviceId: appointmentDetails.serviceId, 
        source: appointmentDetails.source,
        contactNumber: appointmentDetails.contactNumber, // Modal 需要 contactNumber
        notes: appointmentDetails.notes,
        teamId: appointmentDetails.teamId, // 如果是 on-site
        address: appointmentDetails.address, // 传递整个 address 对象
        bookingType: appointmentDetails.bookingType, // 传递 bookingType
        status: appointmentDetails.status,
        // ... 其他可能从 extendedProps 中需要的字段 ...
    };

    // --- 日志：查看最终传递给 Modal 的数据 ---
    console.log('[BookingConfig] Prepared data for AppointmentModal:', JSON.stringify(appointmentToEditData, null, 2));
    // -----------------------------------------

    setSelectedSlot({ // 设置时间槽上下文
      start: event.start,
      end: event.end,
      allDay: event.allDay
    });
    setEditMode(true); // 进入编辑模式
    setAppointmentToEdit(appointmentToEditData); // 将整理好的数据传递给状态
    setIsModalOpen(true); // 打开模态框
  }, []); // 依赖项为空，因为它不依赖外部可变状态

  // Customize event rendering (optional, replaces CustomEvent)
  const renderEventContent = (eventInfo) => {
    // eventInfo contains event, timeText, isStart, isEnd, isMirror, view, etc.
    const props = eventInfo.event.extendedProps || {}; // Add fallback for safety
    
    // --- 修正：读取 props.serviceName ---
    const serviceName = props.serviceName || 'Unknown Service'; 
    const teamName = props.teamName; // Get team name from extendedProps
    const bookingType = props.bookingType; // Get booking type
    
    // --- 修正：读取 props.contactNumber ---
    const contactNumber = props.contactNumber || '无联系方式'; // 直接读取，如果为空则显示默认文本
    
    // 格式化时间
    const startTime = moment(eventInfo.event.start).format('HH:mm');
    const endTime = moment(eventInfo.event.end).format('HH:mm');
    const timeString = `${startTime} - ${endTime}`;

    return (
      <div className="fc-event-main-custom"> 
        <div className="fc-event-time">{timeString}</div>
        {/* 客户名称 */}
        <div className="fc-event-title">{eventInfo.event.title}</div> 
        {/* 服务名称 */}
        <div className="fc-event-service">服务: {serviceName}</div>
        {/* Conditionally render Team Name for on-site bookings */}
        {bookingType === 'on-site' && teamName && (
          <div className="fc-event-team">团队: {teamName}</div>
        )}
        {/* 始终显示联系方式，增加图标以提高可见性 */}
        <div className="fc-event-phone">
          <span className="phone-icon">📱</span> {contactNumber} {/* 使用修正后的 contactNumber */}
        </div>
      </div>
    );
  };

  // Handle Refresh Button Click
  const handleRefresh = useCallback(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const currentView = calendarApi.view;
      console.log("Refreshing calendar view:", currentView.type);
      fetchAppointments({ start: currentView.activeStart, end: currentView.activeEnd });
    }
  }, [fetchAppointments]);

  // 初始化日历后的回调函数
  const handleCalendarDidMount = useCallback(() => {
    console.log("Calendar mounted. Initializing custom behavior...");
    if (calendarRef.current) {
      console.log("Calendar ref exists, checking API...");
      const calendarApi = calendarRef.current.getApi();
      if (calendarApi) {
        // 可以在这里进行额外的初始化
        console.log("Calendar API accessible, initialization complete");
        // 确保正确切换到timeGridWeek视图 (注释掉这行，因为 initialView 应该已经处理了)
        // calendarApi.changeView('timeGridWeek');
        
        // 强制重新渲染日历以解决时间轴问题
        setTimeout(() => {
          calendarApi.updateSize();
          console.log("Calendar size updated to fix potential rendering issues");
        }, 100);
      }
    }
  }, []);

  // --- 新增函数：切换统计视图 --- 
  const toggleStatsView = useCallback(() => {
    setShowStats(prev => !prev);
  }, []);
  // ------------------------------

  // Display global loading message ONLY if initial global load is not complete
  if (!initialBookingConfigLoaded && loading) {
    return <div className="loading">Loading booking configuration...</div>;
  }
  
  // Show error if initial services fetch failed (error state is set in useEffect)
  if (error && services.length === 0) {
    return <div className="error">{error}</div>;
  }

  // --- DEBUGGING: Log agentType right before rendering JSX ---
  console.log('[BookingConfig] Rendering with agentType:', agentType);
  // -------------------------------------------------------

  return (
    <div className="booking-config-container">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="booking-header">
        <h2>Appointment Calendar</h2>
        <div className="header-controls">
          {/* Show spinner next to button when loading */} 
          {loading && <LoadingSpinner />} 
          
          {/* 修改为按钮来切换统计视图 */}
          <button 
            className={`stats-toggle-button btn ${showStats ? 'btn-secondary' : 'btn-info'} me-2`}
            onClick={toggleStatsView} 
            disabled={loading} 
            title={showStats ? "Hide Statistics" : "Show Statistics"}
            aria-label={showStats ? "Hide Statistics" : "Show Statistics"}
          >
            <FaChartBar />
          </button>

          {/* Add map view button, only shown in on-site appointment mode */}
          {agentType === 'on-site' && (
            <Link 
              to="/bookings/map" 
              className="map-view-button btn btn-success me-2"
              title="View Map"
              aria-label="View Map"
            >
              <FaMapMarkedAlt /> Map View
            </Link>
          )}

          {/* Service Settings Button */}
          <button 
            className="service-settings-button btn btn-secondary me-2"
            onClick={handleOpenServiceSettingsModal}
            disabled={loading} 
            title="Service Settings"
            aria-label="Service Settings"
          >
            <FaCog />
          </button>
          
          {/* Refresh Button */}
          <button 
            className="refresh-button btn btn-primary"
            onClick={handleRefresh} 
            disabled={loading} 
          >
            Refresh
          </button>
        </div>
      </div>
      
      {/* Source filters */} 
      <div className="source-filters">
         {/* Removed conditional rendering - always show Walk-in source button */} 
         <button className={`source-filter-button ${sourceFilters.walkin ? 'active' : ''}`} onClick={() => toggleSourceFilter('walkin')}> <span className="source-indicator source-indicator-walkin"></span> Walk-in </button>
         <button className={`source-filter-button ${sourceFilters.whatsapp ? 'active' : ''}`} onClick={() => toggleSourceFilter('whatsapp')}> <span className="source-indicator source-indicator-whatsapp"></span> WhatsApp </button>
         <button className={`source-filter-button ${sourceFilters.messenger ? 'active' : ''}`} onClick={() => toggleSourceFilter('messenger')}> <span className="source-indicator source-indicator-messenger"></span> Messenger </button>
         <button className={`source-filter-button ${sourceFilters.instagram ? 'active' : ''}`} onClick={() => toggleSourceFilter('instagram')}> <span className="source-indicator source-indicator-instagram"></span> Instagram </button>
         <button className={`source-filter-button ${sourceFilters.other ? 'active' : ''}`} onClick={() => toggleSourceFilter('other')}> <span className="source-indicator"></span> Other </button>
      </div>
      
      {/* Display error message for appointment fetch errors */} 
      {!loading && error && <div className="error-message">{error}</div>}
      
      {/* --- 条件渲染统计组件 --- */}
      {showStats && (
        <div className="stats-section-container">
          <AppointmentStats appointments={appointments} services={services} />
        </div>
      )}
      {/* -------------------------- */}
      
      <div className="calendar-wrapper">
        {/* Overlay loading indicator on top of calendar */} 
        {loading && <div className="calendar-loading-overlay"><LoadingSpinner/></div>}
        <div className={`calendar-container ${loading ? 'loading' : ''}`}> 
            <FullCalendar
              ref={calendarRef} // Add ref to access API
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin, momentPlugin, scrollGridPlugin]}
              initialView={viewType}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              events={filteredAppointments}
              selectable={true}
              selectMirror={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              eventContent={renderEventContent}
              nowIndicator={true}
              height="auto"
              timeZone='local' // Set the timezone
              
              // 正确配置时间轴相关选项
              slotMinTime="08:00:00" // 从早上8点开始显示
              slotMaxTime="20:00:00" // 显示到晚上8点
              allDaySlot={false} // Re-add to hide the all-day slot in timeGrid views
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                hour12: false // 使用24小时制
              }}
              expandRows={true} // Re-add expandRows for timeGrid layout
              dayMinWidth={100} // 确保日期列有足够的宽度
              stickyHeaderDates={true} // 让头部日期常驻可见
              handleWindowResize={true} // 响应窗口大小变化
              displayEventTime={true} // 显示事件的时间
              displayEventEnd={true} // 显示结束时间
              firstDay={1} // 一周从周一开始
              businessHours={{ // 设置工作时间
                daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // 0=周日，6=周六
                startTime: '09:00',
                endTime: '18:00',
              }}
              eventTimeFormat={{ // 事件时间格式
                hour: '2-digit',
                minute: '2-digit',
                hour12: false // 使用24小时制
              }}
              // 设置钩子来处理日历挂载完成后的行为
              viewDidMount={handleCalendarDidMount}
              
              // 优化重叠显示
              eventMinWidth={80} // 设置事件最小宽度，防止过窄
              eventOverlap={true} // 允许事件相互重叠（默认）
              eventMinHeight={60} // 确保事件最小高度
              eventMaxStack={2} // 限制同一时间槽内的事件堆叠数量，避免过多重叠
              slotDuration={"00:30:00"} // Re-add slotDuration for timeGrid layout
              contentHeight="auto" // 日历高度自适应内容
              aspectRatio={1.8} // 适当的宽高比
            />
        </div>
      </div>
      
      {/* Main Appointment Modal */} 
      {isModalOpen && (
      <AppointmentModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
          services={services}
        selectedSlot={selectedSlot}
          appointmentToEdit={appointmentToEdit} 
        editMode={editMode}
        agentType={agentType}
        />
      )}

      {/* Conflict Modal */} 
      {showConflictModal && conflictData && (
        <ConflictModal 
          show={showConflictModal}
          onHide={handleCloseConflictModal}
          onForce={handleForceSubmit}
          conflictData={conflictData}
        />
      )}
      {/* ------------------------- */}

      {/* --- NEW Service Settings Modal --- */} 
      {showServiceSettingsModal && (
          <ServiceSettingsModal 
            isOpen={showServiceSettingsModal}
            onClose={handleCloseServiceSettingsModal}
          />
      )}
      {/* ---------------------------------- */}
    </div>
  );
}

BookingConfig.propTypes = {
  // agentType might not be used anymore unless needed for filtering/logic
  agentType: PropTypes.oneOf(['walkin', 'onsite']), 
};

export default BookingConfig;