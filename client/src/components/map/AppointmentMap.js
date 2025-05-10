import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { FaCalendarAlt, FaClock, FaMapMarkedAlt, FaUser, FaSearch, FaTimesCircle, FaPhone } from 'react-icons/fa';
import moment from 'moment';
import './AppointmentMap.css';

// Fix Leaflet default icon path
// Import icons directly
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Configure Leaflet default icon options
delete L.Icon.Default.prototype._getIconUrl; 
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// Custom icon creation function for numbered markers
const createCustomIcon = (color, text, accuracyLevel = null) => {
  // 根据精确度调整颜色的透明度
  let markerColor = color;
  let borderColor = '#333';
  let accuracyIndicator = null;

  // 根据精确度级别设置指示器颜色
  if (accuracyLevel) {
    switch(accuracyLevel) {
      case 'very_high':
        accuracyIndicator = '#00c853'; // 深绿色
        borderColor = '#00c853';
        break;
      case 'high':
        accuracyIndicator = '#64dd17'; // 绿色
        borderColor = '#64dd17';
        break;
      case 'medium':
        accuracyIndicator = '#ffd600'; // 黄色
        borderColor = '#ffd600';
        break;
      case 'low':
        accuracyIndicator = '#ff9100'; // 橙色
        borderColor = '#ff9100';
        break;
      case 'very_low':
        accuracyIndicator = '#ff3d00'; // 红色
        borderColor = '#ff3d00';
        break;
      default:
        accuracyIndicator = '#757575'; // 灰色表示未知
        borderColor = '#757575';
    }
  }

  return new L.DivIcon({
    className: 'custom-map-marker',
    html: `
      <div class="marker-container" style="border: 2px solid ${borderColor};">
        <div class="marker-circle" style="background-color: ${markerColor}">
          <span class="marker-text">${text}</span>
        </div>
        ${accuracyIndicator ? `<div class="accuracy-indicator" style="background-color: ${accuracyIndicator}" title="地理编码精确度: ${getAccuracyLevelText(accuracyLevel)}"></div>` : ''}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// 获取精确度等级的可读文本
const getAccuracyLevelText = (level) => {
  switch(level) {
    case 'very_high': return '非常高';
    case 'high': return '高';
    case 'medium': return '中等';
    case 'low': return '低';
    case 'very_low': return '非常低';
    default: return '未知';
  }
};

// Pin icon for placement mode
const pinIcon = L.divIcon({
  className: 'pin-map-marker',
  html: `<div>
           <span>📍</span>
         </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// Map view updater component
const MapUpdater = ({ appointments }) => {
  const mapInstance = useMap();
  useEffect(() => {
    // Filter valid coordinate points
    const validPoints = appointments.filter(app => app.coordinates && app.coordinates.lat && app.coordinates.lng);
    
    if (validPoints.length > 0) {
      const latitudes = validPoints.map(p => p.coordinates.lat);
      const longitudes = validPoints.map(p => p.coordinates.lng);
      
      try {
        const bounds = L.latLngBounds(
          L.latLng(Math.min(...latitudes), Math.min(...longitudes)),
          L.latLng(Math.max(...latitudes), Math.max(...longitudes))
        );
        
        if (mapInstance && bounds.isValid()) {
            mapInstance.fitBounds(bounds, { padding: [50, 50] }); 
        } else if (mapInstance && validPoints.length === 1) {
            const point = validPoints[0];
            mapInstance.setView([point.coordinates.lat, point.coordinates.lng], 13); 
        }
      } catch (error) {
        console.error("Map bounds calculation error:", error);
        // Default view
        mapInstance.setView([3.1390, 101.6869], 11);
      }
    } else if (mapInstance) {
      // If no valid points, reset to default view
      mapInstance.setView([3.1390, 101.6869], 11); // Default: Kuala Lumpur
    }
  }, [appointments, mapInstance]);
  return null;
};

// Location picker component
const LocationPicker = ({ onLocationSelected, active }) => {
  const [tempMarker, setTempMarker] = useState(null);
  
  useMapEvents({
    click: (e) => {
      if (!active) return;
      
      const { lat, lng } = e.latlng;
      setTempMarker({ lat, lng });
      
      if (onLocationSelected) {
        onLocationSelected({ lat, lng });
      }
    }
  });
  
  return tempMarker && active ? (
    <Marker 
      position={[tempMarker.lat, tempMarker.lng]}
      icon={pinIcon}
    />
  ) : null;
};

// Utility function: build address string for popup display
const buildAddressStringForPopup = (address) => {
  if (!address) return null;
  const parts = [
    address.line1,
    address.line2,
    address.city,
    address.postalCode,
    address.country
  ];
  return parts.filter(part => part && String(part).trim() !== '').join(', ');
};

// Main map component
const AppointmentMap = ({ appointments, onAppointmentSelect }) => {
  // Component state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter] = useState('all'); // 'all', 'mapped', 'unmapped'
  const [locationPickerActive, setLocationPickerActive] = useState(false);
  
  // Handle marker click
  const handleMarkerClick = (appointment) => {
    setSelectedAppointment(appointment);
    if (onAppointmentSelect) {
      onAppointmentSelect(appointment);
    }
  };
  
  // Handle pin location selection
  const handlePinLocationSelected = (location) => {
    setLocationPickerActive(false);
    console.log('[Pin Location] Selected location:', location);
  };

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const props = app.extendedProps || {};
      const searchLower = searchQuery.toLowerCase();
      
      // Match search query
      const matchesSearch = searchQuery === '' || 
        (props.clientName && props.clientName.toLowerCase().includes(searchLower)) ||
        (props.serviceName && props.serviceName.toLowerCase().includes(searchLower)) ||
        (props.teamName && props.teamName.toLowerCase().includes(searchLower)) ||
        (app.title && app.title.toLowerCase().includes(searchLower));
      
      // Match by coordinates based on filter
      const hasCoords = !!(app.coordinates?.lat && app.coordinates?.lng);
      const matchesFilter = activeFilter === 'all' || 
        (activeFilter === 'mapped' && hasCoords) ||
        (activeFilter === 'unmapped' && !hasCoords);
      
      return matchesSearch && matchesFilter;
    });
  }, [appointments, searchQuery, activeFilter]);
  
  // Filter valid appointment coordinates
  const validAppointments = useMemo(() => 
      filteredAppointments.filter(app => app?.coordinates?.lat && app?.coordinates?.lng),
      [filteredAppointments]
  );

  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Render appointment list item
  const renderAppointmentItem = (appointment, index) => {
    const props = appointment.extendedProps || {};
    const hasCoords = !!appointment.coordinates;
    
    // Format address for display
    const address = props.address ? buildAddressStringForPopup(props.address) : null;
    const contactInfo = props.contactInfo || props.phoneNumber || props.email || null;
    
    return (
      <li 
        key={appointment.id} 
        className={`
          ${selectedAppointment?.id === appointment.id ? 'selected' : ''}
          ${hasCoords ? 'has-coords' : 'no-coords'}
          ${hasCoords && props.accuracyLevel ? `accuracy-${props.accuracyLevel}` : ''}
        `}
        onClick={() => handleMarkerClick(appointment)}
      >
        <div className="appointment-time">
          <span role="img" aria-label="Time">
            <FaClock />
          </span>
          {moment(appointment.start).format('h:mm a')}
        </div>
        
        <div className="appointment-client">
          {props.clientName || 'Unnamed Client'}
        </div>
        
        {props.serviceName && (
          <div className="appointment-service-name">
            <span role="img" aria-label="Service">
              <FaCalendarAlt />
            </span>
            {props.serviceName}
          </div>
        )}
        
        {props.teamName && (
          <div className="appointment-team-name">
            <span role="img" aria-label="Team">
              <FaUser />
            </span>
            {props.teamName}
          </div>
        )}
        
          <div className="appointment-address">
            <span role="img" aria-label="Address">
              <FaMapMarkedAlt />
            </span>
          {address || 'No address provided'}
          </div>
        
          <div className="appointment-contact">
            <span role="img" aria-label="Contact">
              <FaPhone />
            </span>
          {contactInfo || 'No contact information'}
          </div>
          
        {!hasCoords && props.geocodingFailReason && (
          <div className="geocode-failed-indicator">
            Geocoding failed: {props.geocodingFailReason || 'Unknown error'}
          </div>
        )}
        
        {hasCoords && props.accuracyScore !== undefined && (
          <div className="geocode-accuracy-indicator">
            <span className={`accuracy-dot ${props.accuracyLevel || 'unknown'}`} 
                  title={`Geocode accuracy: ${getAccuracyLevelText(props.accuracyLevel)} (${Math.round((props.accuracyScore || 0) * 100)}%)`}>
            </span>
          </div>
        )}
      </li>
    );
  };
      
  return (
    <div className="appointment-map-container">      
      <div className="map-content">
        {/* Appointment list section */}
        <div className="appointment-list-panel">
          <div className="appointment-list-header">
            <h4>Appointments ({filteredAppointments.length} of {appointments.length} total, {validAppointments.length} on map)</h4>
            <div className="appointment-search">
              <div className="search-input-container">
                <FaSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="search-input"
                />
                {searchQuery && (
                  <button 
                    className="clear-search-btn" 
                    onClick={clearSearch}
                    title="Clear search"
                  >
                    <FaTimesCircle />
                  </button>
                )}
              </div>
            </div>
          </div>
          {filteredAppointments.length === 0 ? (
              <p className="no-appointments-message">
                {searchQuery || activeFilter !== 'all' ? 'No appointments match your filter criteria.' : 'No appointments found matching the selected criteria.'}
              </p>
          ) : (
            <ul>
              {filteredAppointments.map((appointment, index) => 
                renderAppointmentItem(appointment, index)
              )}
            </ul>
          )}
        </div>
        
        {/* Leaflet map section */}
        <div className="leaflet-map-container">
          <MapContainer 
            center={[3.1390, 101.6869]} 
            zoom={11} 
            className="leaflet-map"
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
              
            <MapUpdater appointments={validAppointments} /> 
            
            {/* Location picker for pin mode */}
            <LocationPicker 
              onLocationSelected={handlePinLocationSelected} 
              active={locationPickerActive} 
            />
            
            {/* Display appointment markers */}
            {validAppointments.map((appointment, index) => {
              let markerColor = '#3498db';
              
              // Use team color if available
              if (appointment.extendedProps && appointment.extendedProps.teamColour) {
                markerColor = appointment.extendedProps.teamColour;
              }
                
              return (
                <Marker
                  key={appointment.id}
                  position={[appointment.coordinates.lat, appointment.coordinates.lng]}
                  icon={createCustomIcon(markerColor, (index + 1).toString(), appointment.extendedProps?.accuracyLevel)}
                  eventHandlers={{
                    click: () => handleMarkerClick(appointment)
                  }}
                >
                  <Popup>
                    <div className="map-info-window">
                      <h3>{appointment.extendedProps.clientName || appointment.title}</h3>
                      <p><strong>Time:</strong> {moment(appointment.start).format('YYYY-MM-DD HH:mm')}</p>
                      <p><strong>Service:</strong> {appointment.extendedProps.serviceName || 'Not specified'}</p>
                      <p><strong>Team:</strong> {appointment.extendedProps.teamName || 'Unassigned'}</p>
                      <p><strong>Address:</strong> {appointment.extendedProps.address ? buildAddressStringForPopup(appointment.extendedProps.address) : 'No address provided'}</p>
                      {appointment.extendedProps.contactInfo && (
                        <p><strong>Contact:</strong> {appointment.extendedProps.contactInfo}</p>
                      )}
                      {appointment.extendedProps.phoneNumber && (
                        <p><strong>Phone:</strong> {appointment.extendedProps.phoneNumber}</p>
                      )}
                      {appointment.extendedProps.email && (
                        <p><strong>Email:</strong> {appointment.extendedProps.email}</p>
                      )}
                      {!appointment.extendedProps.contactInfo && !appointment.extendedProps.phoneNumber && !appointment.extendedProps.email && (
                        <p><strong>Contact:</strong> No contact information</p>
                      )}
                      {/* Display geocoding accuracy information */}
                      {appointment.extendedProps.accuracyScore !== undefined && (
                        <div className={`geocode-accuracy ${appointment.extendedProps.accuracyLevel || 'unknown'}`}>
                          <p><strong>Geocode Accuracy:</strong> {getAccuracyLevelText(appointment.extendedProps.accuracyLevel)} 
                            ({Math.round((appointment.extendedProps.accuracyScore || 0) * 100)}%)
                          </p>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default AppointmentMap; 