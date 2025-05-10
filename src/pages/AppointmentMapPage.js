import React, { useState, useEffect, useCallback } from 'react';
import AppointmentMap from '../components/AppointmentMap'; // Adjust path as needed
import { appointmentService } from '../services/appointmentService'; // Adjust path as needed
import { routeOptimizationService } from '../services/routeOptimizationService'; // We'll create this service

const AppointmentMapPage = () => {
  const [mapAppointments, setMapAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [optimizedRouteData, setOptimizedRouteData] = useState(null);
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false);
  const [optimizationError, setOptimizationError] = useState(null);

  // Fetch initial map appointments
  const fetchMapAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await appointmentService.getMapAppointments(); // Assuming this exists
      setMapAppointments(data || []);
    } catch (err) {
      console.error("Error fetching map appointments:", err);
      setError(err.message || 'Failed to load appointments for map.');
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchMapAppointments();
  }, [fetchMapAppointments]);

  const handleOptimizeRoute = async () => {
    if (mapAppointments.length < 2) {
      setOptimizationError("At least two appointments are needed to optimize a route.");
      return;
    }
    setIsOptimizingRoute(true);
    setOptimizationError(null);
    setOptimizedRouteData(null); // Clear previous route

    // Prepare waypoints for the API
    // The backend expects id, latitude, longitude.
    // Ensure your mapAppointments objects have these, or map them accordingly.
    const waypoints = mapAppointments.map(appt => ({
      id: appt.id || appt._id, // Use appt.id or appt._id depending on your data structure
      latitude: appt.latitude,
      longitude: appt.longitude,
      name: appt.clientName || appt.address, // Optional: for easier identification if needed
    }));

    try {
      // Assuming a default profile, and no fixed start/end for now.
      // These could be made configurable in the UI later.
      const data = await routeOptimizationService.optimizeRoute({ waypoints }); 
      setOptimizedRouteData(data);
      console.log("Route optimized:", data);
    } catch (err) {
      console.error("Error optimizing route:", err);
      setOptimizationError(err.message || 'Failed to optimize route.');
    } finally {
      setIsOptimizingRoute(false);
    }
  };

  if (isLoading) {
    return <div>Loading map data...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Onsite Appointments Map</h1>
      {mapAppointments.length > 0 && (
        <button 
          onClick={handleOptimizeRoute} 
          disabled={isOptimizingRoute || mapAppointments.length < 2}
          style={{ marginBottom: '20px', padding: '10px 15px' }}
        >
          {isOptimizingRoute ? 'Optimizing...' : 'Optimize Route'}
        </button>
      )}
      {optimizationError && <div style={{ color: 'red', marginBottom: '10px' }}>Optimization Error: {optimizationError}</div>}
      
      <div style={{ height: '70vh', width: '100%' }}>
        <AppointmentMap 
          appointments={mapAppointments} 
          optimizedRouteData={optimizedRouteData} // Pass the new data
        />
      </div>
       {/* Optionally, display optimized route details */}
       {optimizedRouteData && optimizedRouteData.optimizedWaypoints && (
        <div style={{ marginTop: '20px' }}>
          <h2>Optimized Route Order:</h2>
          <ol>
            {optimizedRouteData.optimizedWaypoints.map(wp => (
              <li key={wp.id}>{wp.name || wp.id} (Lat: {wp.latitude.toFixed(4)}, Lng: {wp.longitude.toFixed(4)})</li>
            ))}
          </ol>
          {optimizedRouteData.routeGeometry && (
            <p>
              Total Distance: {(optimizedRouteData.routeGeometry.distance / 1000).toFixed(2)} km, 
              Estimated Duration: {(optimizedRouteData.routeGeometry.duration / 60).toFixed(2)} minutes.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AppointmentMapPage; 