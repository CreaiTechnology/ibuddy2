import axios from 'axios';

// Define the base URL for the backend API
// Use environment variable or default to localhost:3001 (confirmed backend port)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Optional: Add interceptors for request/response handling
// Request interceptor (e.g., to add auth token)
axiosInstance.interceptors.request.use(
  (config) => {
    // 修改为从localStorage获取auth_token而不是accessToken
    const token = localStorage.getItem('auth_token'); 
    console.log("Axios Interceptor - Reading token using key 'auth_token':", token ? 'Found' : 'Not Found'); 
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("Axios Interceptor - Setting Authorization header."); 
    } else {
      console.log("Axios Interceptor - 'auth_token' not found in localStorage."); 
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (e.g., for global error handling)
axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Example: Handle 401 Unauthorized globally
    if (error.response && error.response.status === 401) {
      // Redirect to login, clear token, etc.
      console.error('Unauthorized access - 401');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;