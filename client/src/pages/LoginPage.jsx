import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; // Use the configured instance
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './LoginPage.css'; // Make sure CSS path is correct

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (event) => {
        event.preventDefault(); // Prevent default form submission
        setIsLoading(true);
        console.log('Attempting login with:', { email }); // Don't log password

        try {
            const response = await axiosInstance.post('/auth/login', { // Endpoint is relative to baseURL
                email,
                password,
            });

            console.log('Login response:', response.data);

            if (response.data && response.data.accessToken) {
                // Store the token in localStorage
                localStorage.setItem('auth_token', response.data.accessToken);
                console.log('Token stored in localStorage');

                // Optionally, you can configure axiosInstance to use the token *immediately*
                // This might be redundant if the interceptor is set up correctly
                // axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;

                toast.success('Login successful! Redirecting...');

                // Redirect to the dashboard or another protected route after a short delay
                setTimeout(() => {
                    navigate('/dashboard'); // Adjust the target route if needed
                }, 1500);
            } else {
                // Handle cases where login is successful (2xx) but no token is returned
                console.error('Login successful but no token received.', response.data);
                toast.error('Login failed: Could not verify credentials.');
            }
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Login failed. Please check your credentials or try again later.';
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error('Login error response data:', error.response.data);
                console.error('Login error response status:', error.response.status);
                if (error.response.status === 401) {
                    errorMessage = 'Invalid email or password.';
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = `Login failed: ${error.response.data.message}`;
                }
            } else if (error.request) {
                // The request was made but no response was received
                console.error('Login error request:', error.request);
                errorMessage = 'Login failed: Could not connect to the server.';
            } else {
                // Something happened in setting up the request that triggered an Error
                console.error('Login setup error:', error.message);
                errorMessage = `Login failed: ${error.message}`;
            }
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page-container">
            <ToastContainer 
                position="top-right" 
                autoClose={5000} 
                hideProgressBar={false} 
                newestOnTop={false} 
                closeOnClick 
                rtl={false} 
                pauseOnFocusLoss 
                draggable 
                pauseOnHover 
            />
            <div className="login-form-card">
                <h2>Login to Your Account</h2>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                        />
                    </div>
                    <button type="submit" className="login-button" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div className="login-links">
                    <Link to="/forgot-password">Forgot Password?</Link>
                    <span className="link-separator">|</span>
                    <Link to="/register">Don't have an account? Sign Up</Link>
                </div>
            </div>
        </div>
    );
}

export default LoginPage; 