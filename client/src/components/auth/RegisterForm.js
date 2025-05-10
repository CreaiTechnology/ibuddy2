import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Import Link
import { useAuth } from '../../context/AuthContext'; // Import useAuth hook
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AuthForm.css'; // Import the shared CSS file

function RegisterForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password2: '', // For password confirmation
        companyName: '' // Added company name
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, signInWithGoogle } = useAuth(); // Get specific handlers from useAuth

    const { name, email, password, password2, companyName } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        if (password !== password2) {
            toast.error('Passwords do not match');
            return;
        }
        setError(''); 
        setLoading(true);
        // Call the register handler from context
        const { success, error: registerError } = await register(name, email, password, companyName);
        setLoading(false);
        if (!success) {
             setError(registerError || 'Registration failed');
             toast.error(registerError || 'Registration failed');
        }
        // Navigation/Alert is handled within the register handler
    };

    const handleGoogleSignIn = async () => {
        setError('');
        await signInWithGoogle();
    };

    return (
        <form onSubmit={onSubmit} className="auth-form-container">
            <ToastContainer 
                position="top-right" 
                autoClose={5000} 
                hideProgressBar={false} 
                newestOnTop 
                closeOnClick 
                rtl={false} 
                pauseOnFocusLoss 
                draggable 
                pauseOnHover 
            />
            <h2>Create Your Account</h2>
            <p className="auth-form-subtitle">Get started with our AI Content Creation Platform</p>
            
            {error && <p className="error-message">{error}</p>}
            
            <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                    type="text"
                    placeholder="Enter your full name"
                    name="name"
                    id="name"
                    value={name}
                    onChange={onChange}
                    required
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                    type="email"
                    placeholder="Enter your email"
                    name="email"
                    id="email"
                    value={email}
                    onChange={onChange}
                    required
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="companyName">Company Name (Optional)</label>
                <input
                    type="text"
                    placeholder="Enter your company name"
                    name="companyName"
                    id="companyName"
                    value={companyName}
                    onChange={onChange}
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                    type="password"
                    placeholder="Create a password (min. 6 characters)"
                    name="password"
                    id="password"
                    value={password}
                    onChange={onChange}
                    required
                    minLength="6"
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="password2">Confirm Password</label>
                <input
                    type="password"
                    placeholder="Confirm your password"
                    name="password2"
                    id="password2"
                    value={password2}
                    onChange={onChange}
                    required
                    minLength="6"
                />
            </div>
            
            <div className="terms-privacy">
                By registering, you agree to our <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
                 {loading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="social-button-container">
                <button 
                    type="button" 
                    className="social-button google-button" 
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                >
                    <i className="fab fa-google"></i> Sign up with Google
                </button>
            </div>

            <p className="auth-switch-link">
                Already have an account? <Link to="/login">Login here</Link>
            </p>
        </form>
    );
}

export default RegisterForm; 