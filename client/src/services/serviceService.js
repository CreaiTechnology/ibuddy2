import axiosInstance from '../api/axiosInstance'; // Corrected import path

// Remove the hardcoded base URL
// const API_BASE_URL = 'http://localhost:5000/api';

// Normalize service data for client use
const normalizeService = (service) => {
  console.log(`[normalizeService] Processing service:`, JSON.stringify(service));
  console.log(`[normalizeService]   service.id: ${service.id}, type: ${typeof service.id}`);
  console.log(`[normalizeService]   service._id: ${service._id}, type: ${typeof service._id}`);
  const resultId = service.id || service._id;
  console.log(`[normalizeService]   Calculated resultId: ${resultId}, type: ${typeof resultId}`);

  // Read from 'colour' and provide fallback for invalid values
  let serviceColor = service.colour; // Read from the backend property
  if (!serviceColor || typeof serviceColor !== 'string' || !serviceColor.startsWith('#')) {
    console.warn(`[normalizeService] Invalid or missing color value ('${serviceColor}') for service ID ${resultId}. Using default fallback.`);
    // Simple fallback based on known invalid values or a general default
    if (serviceColor === 'h') {
        serviceColor = '#3498DB'; // Blue as fallback for 'h'
    } else if (serviceColor === 'a') {
        serviceColor = '#F39C12'; // Orange as fallback for 'a'
    } else {
        serviceColor = '#7F8C8D'; // Grey as general fallback
    }
  }

  return {
    id: resultId,
    name: service.name,
    duration: service.duration,
    price: service.price,
    colour: serviceColor, // 统一使用 'colour' 作为颜色属性
    description: service.description || '',
    max_overlap: service.max_overlap
  };
};

/**
 * Fetch all services
 * @returns {Promise<Array>} - Array of normalized service objects
 */
export const fetchServices = async () => {
  console.log('[serviceService] fetchServices function entered.');
  try {
    // 修改 API 路径，添加 /api 前缀
    const response = await axiosInstance.get('/api/services'); 
    
    if (response.status !== 200) {
      // axiosInstance usually throws for non-2xx, but check just in case
      throw new Error(`Error fetching services: ${response.statusText}`);
    }
    
    return response.data.map(service => normalizeService(service));
  } catch (error) {
    // Log the error caught by axios interceptor or network issue
    console.error('Error fetching services:', error);
    throw error; // Re-throw so the caller component knows about the failure
  }
};

/**
 * Create a new service
 * @param {Object} serviceData - The service data to create (including optional max_overlap)
 * @returns {Promise<Object>} - The created service
 */
export const createService = async (serviceData) => {
  try {
    const apiData = {
      name: serviceData.name,
      duration: serviceData.duration,
      price: serviceData.price,
      colour: serviceData.colour, 
      description: serviceData.description,
      ...(serviceData.max_overlap !== undefined && { max_overlap: serviceData.max_overlap })
    };
    
    console.log('[createService] Sending data to API:', apiData);
    // 修改 API 路径，添加 /api 前缀
    const response = await axiosInstance.post('/api/services', apiData); 
    
    // Axios instance throws on non-2xx/3xx status codes by default
    // So if we get here, it should be 200 or 201
    console.log('Service created/updated successfully, status:', response.status);
    return normalizeService(response.data);
    
  } catch (error) {
    // Log the error from axios interceptor or network
    console.error('Error creating service:', error.response?.data || error);
    throw error; // Re-throw for caller component
  }
};

/**
 * Update an existing service
 * @param {string} serviceId - The ID of the service to update
 * @param {Object} serviceData - The updated service data
 * @returns {Promise<Object>} - The updated service
 */
export const updateService = async (serviceId, serviceData) => {
  try {
    const apiData = {
      name: serviceData.name,
      duration: serviceData.duration,
      price: serviceData.price,
      colour: serviceData.colour,
      description: serviceData.description,
      ...(serviceData.max_overlap !== undefined && { max_overlap: serviceData.max_overlap })
    };
    console.log(`[updateService] Sending data to API for service ${serviceId}:`, apiData);
    // 修改 API 路径，添加 /api 前缀
    const response = await axiosInstance.put(`/api/services/${serviceId}`, apiData); 
    console.log('Service updated successfully, status:', response.status);
    return normalizeService(response.data);
  } catch (error) {
    console.error(`Error updating service ${serviceId}:`, error.response?.data || error);
    throw error;
  }
};

/**
 * Delete a service
 * @param {string} serviceId - The ID of the service to delete
 * @returns {Promise<void>}
 */
export const deleteService = async (serviceId) => {
  try {
    console.log(`[deleteService] Sending delete request for service ${serviceId}`);
    // 修改 API 路径，添加 /api 前缀
    const response = await axiosInstance.delete(`/api/services/${serviceId}`); 
    console.log('Service deleted successfully, status:', response.status); // Usually 204 No Content
  } catch (error) {
    console.error(`Error deleting service ${serviceId}:`, error.response?.data || error);
    throw error;
  }
};

/**
 * Get a service by ID
 * @param {string} id - The service ID
 * @returns {Promise<Object>} - The service object
 */
export const getServiceById = async (id) => {
  try {
    // 修改 API 路径，添加 /api 前缀
    const response = await axiosInstance.get(`/api/services/${id}`);
    
    if (response.status !== 200) {
      throw new Error(`Error fetching service: ${response.statusText}`);
    }
    
    return normalizeService(response.data);
  } catch (error) {
    console.error(`Error fetching service with ID ${id}:`, error);
    throw error;
  }
};

/**
 * Get all services with normalized data structure
 * @returns {Promise<Object>} - Response object with data property containing normalized services
 */
export const getServices = async () => {
  try {
    const services = await fetchServices();
    return {
      data: services
    };
  } catch (error) {
    console.error('Error in getServices:', error);
    throw error;
  }
};

// Create a named export object
const serviceServiceExports = {
  fetchServices,
  createService,
  updateService,
  deleteService,
  getServiceById,
  getServices
};

export default serviceServiceExports; 