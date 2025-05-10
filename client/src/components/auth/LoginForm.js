import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { useAuth } from '../../context/AuthContext'; // Import useAuth hook
import './AuthForm.css'; // Import the shared CSS file

function LoginForm() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, signInWithGoogle } = useAuth(); // Get login and signInWithGoogle functions from context

    const { email, password } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        // Call the login handler from context
        const { success, error: loginError } = await login(email, password);
        setLoading(false); // Stop loading after attempt
        if (!success) {
            setError(loginError || 'Login failed');
        }
        // Navigation is handled within the login handler or onAuthStateChange
    };

    const handleGoogleSignIn = async () => {
        setError(''); // Clear previous errors
        // Call the signInWithGoogle handler from context
        await signInWithGoogle(); 
        // Supabase handles the redirect
    };

    return (
        // Use className instead of style prop
        <form onSubmit={onSubmit} className="auth-form-container">
            <h2>Login</h2> {/* Add title inside form container */}
            {error && <p className="error-message">{error}</p>}
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    placeholder="Enter your email"
                    name="email"
                    id="email" // Add id for label association
                    value={email}
                    onChange={onChange}
                    required
                />
            </div>
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    placeholder="Enter your password"
                    name="password"
                    id="password" // Add id for label association
                    value={password}
                    onChange={onChange}
                    required
                />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="social-button-container">
                <button 
                    type="button" 
                    className="social-button google-button" 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <i className="fab fa-google"></i> Login with Google
                </button>
            </div>

             {/* Link to Register page */}
             <p className="auth-switch-link">
                 Don't have an account? <Link to="/register">Register here</Link>
             </p>
        </form>
    );
}

export default LoginForm; 