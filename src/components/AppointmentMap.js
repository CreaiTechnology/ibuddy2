import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to adjust map view when appointments change
const MapUpdater = ({ appointments, optimizedRouteData }) => {
  const map = useMap();

  useEffect(() => {
    if (optimizedRouteData && optimizedRouteData.routeGeometry && optimizedRouteData.routeGeometry.geometry) {
      // If there's an optimized route, fit map to its bounds
      try {
        const geoJsonLayer = L.geoJSON(optimizedRouteData.routeGeometry.geometry);
        map.fitBounds(geoJsonLayer.getBounds());
      } catch (e) {
        console.error("Error creating bounds from route geometry:", e);
        // Fallback if route geometry is invalid for bounds calculation
        if (appointments && appointments.length > 0) {
          const validAppointments = appointments.filter(appt => appt.latitude != null && appt.longitude != null);
          if (validAppointments.length > 0) {
            const bounds = L.latLngBounds(validAppointments.map(appt => [appt.latitude, appt.longitude]));
            if (bounds.isValid()) {
              map.fitBounds(bounds);
            }
          }
        }
      }
    } else if (appointments && appointments.length > 0) {
      // Otherwise, fit to appointment markers
      const validAppointments = appointments.filter(appt => appt.latitude != null && appt.longitude != null);
      if (validAppointments.length > 0) {
        const bounds = L.latLngBounds(validAppointments.map(appt => [appt.latitude, appt.longitude]));
        if (bounds.isValid()) {
          map.fitBounds(bounds);
        }
      }
    }
  }, [appointments, optimizedRouteData, map]);

  return null;
};

const AppointmentMap = ({ appointments, optimizedRouteData }) => {
  // Default center if no appointments (e.g., New York)
  const defaultCenter = [40.7128, -74.0060]; 
  const defaultZoom = 10;

  const routeStyle = {
    color: 'blue',
    weight: 5,
    opacity: 0.7,
  };

  // Create a unique key for GeoJSON layer to force re-render when route changes
  // This is important because react-leaflet's GeoJSON component might not update deeply nested data changes otherwise.
  const geoJsonKey = optimizedRouteData && optimizedRouteData.routeGeometry && optimizedRouteData.routeGeometry.geometry 
    ? JSON.stringify(optimizedRouteData.routeGeometry.geometry) 
    : 'no-route';

  return (
    <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {appointments && appointments.map((appt) => (
        appt.latitude && appt.longitude && (
          <Marker key={appt.id || appt._id} position={[appt.latitude, appt.longitude]}>
            <Popup>
              {appt.clientName || 'Appointment'}<br />
              {appt.address || 'No address'}<br />
              Status: {appt.status || 'N/A'}<br />
              {appt.dateTime ? new Date(appt.dateTime).toLocaleString() : 'No date'}
            </Popup>
          </Marker>
        )
      ))}

      {/* Display the optimized route from Mapbox */}
      {optimizedRouteData && optimizedRouteData.routeGeometry && optimizedRouteData.routeGeometry.geometry && (
        <GeoJSON 
          key={geoJsonKey} // Force re-render on data change
          data={optimizedRouteData.routeGeometry.geometry} 
          style={routeStyle} 
        />
      )}
      
      <MapUpdater appointments={appointments} optimizedRouteData={optimizedRouteData} />
    </MapContainer>
  );
};

export default AppointmentMap;
