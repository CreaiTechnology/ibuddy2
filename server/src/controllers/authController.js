const supabase = require('../config/supabase');

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Use Supabase Auth to sign in the user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Supabase login error:', error.message);
      // Provide a generic error message for security reasons
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }

    // On successful login, Supabase returns session data including the access token
    if (data && data.session) {
        console.log(`User logged in successfully: ${email}`);
        // Send back the relevant session information (e.g., access token, user details)
        // IMPORTANT: Avoid sending back the refresh token directly unless necessary and handled securely client-side.
        res.json({ 
            message: 'Login successful', 
            accessToken: data.session.access_token,
            user: {
                id: data.user.id,
                email: data.user.email,
                // Add other user fields if needed
            } 
            // expiresAt: data.session.expires_at // Optional: Send token expiry time
        });
    } else {
      // Should not happen if no error, but handle defensively
      console.error('Supabase login did not return session data.');
      return res.status(500).json({ message: 'Login failed unexpectedly.' });
    }

  } catch (err) {
    console.error('Server error during login:', err);
    res.status(500).json({ message: 'Internal server error during login.' });
  }
};

module.exports = {
  loginUser,
}; 