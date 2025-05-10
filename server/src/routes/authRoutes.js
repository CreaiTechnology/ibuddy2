const express = require('express');
const supabase = require('../config/supabase'); // Ensure this path is correct

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Use Supabase to sign in the user
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            console.error('Supabase login error:', error.message);
            // Provide a more generic error message to the client for security
            return res.status(401).json({ message: 'Invalid login credentials.' });
        }

        // On successful login, Supabase returns user info and session data including the access token
        if (data && data.session && data.session.access_token) {
            res.json({
                message: 'Login successful!',
                accessToken: data.session.access_token,
                // Optionally return user details if needed, but be mindful of sensitive info
                // user: data.user
            });
        } else {
            // This case might indicate an unexpected response from Supabase
            console.error('Supabase login response missing session data:', data);
            res.status(500).json({ message: 'Login failed due to an unexpected error.' });
        }
    } catch (err) {
        console.error('Server error during login:', err);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { email, password, firstName, lastName, companyName } = req.body;
    
    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }
    
    try {
        // Use Supabase to register a new user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName || '',
                    last_name: lastName || '',
                    company_name: companyName || '',
                    created_at: new Date().toISOString(),
                }
            }
        });
        
        if (error) {
            console.error('Registration error:', error.message);
            return res.status(400).json({ message: error.message });
        }
        
        // Check if the user was successfully created
        if (data && data.user) {
            // After successful registration, also create a user profile entry if needed
            const userId = data.user.id;
            
            // You might want to create a user profile entry in a custom table
            // This is optional and depends on your data model
            const { error: profileError } = await supabase
                .from('user_profiles')
                .insert({
                    user_id: userId,
                    first_name: firstName || '',
                    last_name: lastName || '',
                    company_name: companyName || '',
                    created_at: new Date().toISOString(),
                });
                
            if (profileError) {
                console.error('Error creating user profile:', profileError);
                // We don't return an error to the client here since the auth user was created
                // But you might want to log this issue or handle it differently
            }
            
            res.status(201).json({ 
                message: 'Registration successful! Please check your email to confirm your account.',
                // You can return the user ID or other non-sensitive info if needed
                userId: userId
            });
        } else {
            console.error('Unexpected registration response:', data);
            res.status(500).json({ message: 'Registration failed due to an unexpected error.' });
        }
    } catch (err) {
        console.error('Server error during registration:', err);
        res.status(500).json({ message: 'Internal server error during registration.' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required.' });
    }
    
    try {
        // Supabase provides a built-in reset password function
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: process.env.PASSWORD_RESET_REDIRECT_URL || 'http://localhost:3000/reset-password',
        });
        
        if (error) {
            console.error('Password reset request error:', error.message);
            // For security reasons, don't tell the client if the email exists or not
            return res.status(400).json({ message: error.message });
        }
        
        // Always return success, even if email doesn't exist (for security)
        return res.json({ 
            message: 'If your email exists in our system, you will receive password reset instructions.' 
        });
    } catch (err) {
        console.error('Server error during password reset request:', err);
        res.status(500).json({ message: 'Internal server error while processing password reset.' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
        return res.status(400).json({ message: 'New password is required.' });
    }
    
    try {
        // The password reset operation requires the user to be logged in via the reset link
        // This is typically handled on the frontend through the Supabase client
        const { error } = await supabase.auth.updateUser({
            password: password
        });
        
        if (error) {
            console.error('Password update error:', error.message);
            return res.status(400).json({ message: error.message });
        }
        
        return res.json({ message: 'Password has been updated successfully.' });
    } catch (err) {
        console.error('Server error during password update:', err);
        res.status(500).json({ message: 'Internal server error while updating password.' });
    }
});

// You can add other auth-related routes here later (e.g., logout)

module.exports = router; 