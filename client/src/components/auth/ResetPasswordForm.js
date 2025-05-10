import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '../../supabaseClient'; // Import frontend Supabase client
import axiosInstance from '../../api/axiosInstance';
import './AuthForm.css';

function ResetPasswordForm() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [tokenValid, setTokenValid] = useState(false);
    const [validating, setValidating] = useState(true);
    
    const navigate = useNavigate();
    const location = useLocation();
    
    // Extract hash parameters (URL fragment)
    useEffect(() => {
        const validateResetToken = async () => {
            try {
                // Get current URL
                const hash = location.hash; // e.g., #access_token=xxx&type=recovery
                
                // Check if this is a valid recovery link
                if (hash && hash.includes('type=recovery')) {
                    console.log('Valid recovery URL detected');
                    setTokenValid(true);
                } else {
                    setError('Invalid or expired password reset link.');
                    console.error('Not a valid recovery URL');
                }
            } catch (err) {
                console.error('Error validating reset token:', err);
                setError('Unable to validate password reset link.');
            } finally {
                setValidating(false);
            }
        };
        
        validateResetToken();
    }, [location]);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate passwords
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            // With Supabase, the user is already "authenticated" via the recovery token
            // We use the Supabase JS client directly to update the password
            const { error } = await supabase.auth.updateUser({
                password: password
            });
            
            if (error) {
                throw new Error(error.message);
            }
            
            // Also update password on our server if needed
            try {
                await axiosInstance.post('/auth/reset-password', { password });
            } catch (apiError) {
                // Log but don't fail if the API call fails - Supabase auth already succeeded
                console.warn('API password reset notification failed:', apiError);
            }
            
            setSuccess(true);
            toast.success('Password has been reset successfully');
            
            // Redirect to login page after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
            
        } catch (error) {
            console.error('Password reset error:', error);
            setError(error.message || 'Failed to reset password');
            toast.error(error.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };
    
    if (validating) {
        return (
            <div className="auth-form-container">
                <h2>Validating Reset Link</h2>
                <p>Please wait while we validate your password reset link...</p>
            </div>
        );
    }
    
    if (!tokenValid) {
        return (
            <div className="auth-form-container">
                <h2>Invalid Reset Link</h2>
                <div className="error-message">
                    <p>{error || 'The password reset link is invalid or has expired.'}</p>
                    <p>Please request a new password reset link.</p>
                </div>
                <div className="form-actions">
                    <Link to="/forgot-password" className="btn btn-primary">Request New Link</Link>
                    <Link to="/login" className="btn btn-secondary">Back to Login</Link>
                </div>
            </div>
        );
    }
    
    if (success) {
        return (
            <div className="auth-form-container">
                <ToastContainer />
                <h2>Password Reset Successful</h2>
                <div className="success-message">
                    <p>Your password has been reset successfully.</p>
                    <p>You will be redirected to the login page shortly...</p>
                </div>
                <div className="form-actions">
                    <Link to="/login" className="btn btn-primary">Back to Login</Link>
                </div>
            </div>
        );
    }
    
    return (
        <form onSubmit={handleSubmit} className="auth-form-container">
            <ToastContainer />
            <h2>Reset Your Password</h2>
            <p className="auth-form-subtitle">
                Please enter your new password below.
            </p>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
                <label htmlFor="password">New Password</label>
                <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength="6"
                    disabled={loading}
                />
            </div>
            
            <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    minLength="6"
                    disabled={loading}
                />
            </div>
            
            <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
            >
                {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
            
            <p className="auth-switch-link">
                Remember your password? <Link to="/login">Login here</Link>
            </p>
        </form>
    );
}

export default ResetPasswordForm; 