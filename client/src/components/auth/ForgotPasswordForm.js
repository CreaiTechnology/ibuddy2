import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axiosInstance from '../../api/axiosInstance';
import './AuthForm.css';

function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            toast.error('Please enter your email address');
            return;
        }
        
        setLoading(true);
        
        try {
            const response = await axiosInstance.post('/auth/forgot-password', { email });
            setSuccess(true);
            toast.success(response.data.message || 'Password reset instructions sent to your email');
        } catch (error) {
            console.error('Password reset request error:', error);
            toast.error(
                error.response?.data?.message || 
                'An error occurred while processing your request'
            );
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-form-container">
                <ToastContainer />
                <h2>Check Your Email</h2>
                <div className="success-message">
                    <p>
                        If an account exists for <strong>{email}</strong>, we've sent password 
                        reset instructions to that email address.
                    </p>
                    <p>
                        If you don't receive an email within a few minutes, please check your spam folder.
                    </p>
                </div>
                <div className="form-actions">
                    <Link to="/login" className="btn btn-secondary">Back to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="auth-form-container">
            <ToastContainer />
            <h2>Reset Password</h2>
            <p className="auth-form-subtitle">
                Enter your email address and we'll send you instructions to reset your password.
            </p>
            
            <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                />
            </div>
            
            <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
            >
                {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
            
            <p className="auth-switch-link">
                Remember your password? <Link to="/login">Login here</Link>
            </p>
        </form>
    );
}

export default ForgotPasswordForm; 