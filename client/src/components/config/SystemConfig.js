import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axiosInstance'; // Use the configured instance
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function SystemConfig() {
  const [maxOverlap, setMaxOverlap] = useState(2); // Default value
  const [initialMaxOverlap, setInitialMaxOverlap] = useState(2); // Store initial value to check changes
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch current config on component mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    axiosInstance.get('/config')
      .then(response => {
        const value = response.data?.max_overlapping_appointments ?? 2; // Use default if null/undefined
        setMaxOverlap(value);
        setInitialMaxOverlap(value);
        console.log('Fetched system config:', response.data);
      })
      .catch(err => {
        console.error("Error fetching system config:", err);
        setError("Failed to load system configuration. Using default value.");
        toast.error("Failed to load system configuration.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleInputChange = (event) => {
    const value = event.target.value;
    // Allow empty string or convert to number
    setMaxOverlap(value === '' ? '' : parseInt(value, 10));
  };

  const handleSaveConfig = () => {
    const valueToSave = parseInt(maxOverlap, 10);

    // Basic validation
    if (isNaN(valueToSave) || valueToSave < 0) {
      toast.error('Please enter a valid non-negative number for maximum overlap.');
      return;
    }

    if (valueToSave === initialMaxOverlap) {
      toast.info('No changes detected.');
      return;
    }

    setSaving(true);
    setError(null);
    axiosInstance.put('/config', { max_overlapping_appointments: valueToSave })
      .then(response => {
        const updatedValue = response.data?.max_overlapping_appointments ?? valueToSave;
        setMaxOverlap(updatedValue);
        setInitialMaxOverlap(updatedValue);
        toast.success('Configuration saved successfully!');
        console.log('Updated system config:', response.data);
      })
      .catch(err => {
        console.error("Error saving system config:", err);
        setError("Failed to save configuration.");
        toast.error(`Failed to save configuration: ${err.response?.data?.message || err.message}`);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  return (
    <div className="system-config-container p-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <h2>System Configuration</h2>
      <hr />
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3 row">
        <label htmlFor="maxOverlapInput" className="col-sm-4 col-form-label fw-bold">
          Max Allowed Appointment Overlap:
        </label>
        <div className="col-sm-8">
          <input 
            type="number" 
            className="form-control"
            id="maxOverlapInput" 
            value={maxOverlap} 
            onChange={handleInputChange}
            min="0" // Prevent negative numbers
            disabled={saving}
          />
          <div id="maxOverlapHelp" className="form-text">
            Set the maximum number of appointments allowed to overlap in the same time slot. '0' means no overlap allowed.
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end">
        <button 
          className="btn btn-primary" 
          onClick={handleSaveConfig} 
          disabled={saving || maxOverlap === initialMaxOverlap}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

export default SystemConfig; 