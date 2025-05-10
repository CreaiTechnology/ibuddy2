import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient'; // Use Supabase directly
import { useNavigate } from 'react-router-dom'; // To handle redirects
// import { jwtDecode } from 'jwt-decode'; // Optional: Install jwt-decode to decode token locally 

// Create Context
export const AuthContext = createContext();

// Provider Component
export const AuthProvider = ({ children }) => {
    // Get user session and user data from Supabase
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    console.log('AuthProvider: Component rendered/re-rendered. Current loading state:', loading);

    useEffect(() => {
        console.log('AuthProvider: useEffect triggered.');
        let isMounted = true; // Prevent setting state on unmounted component

        // Get initial session
        console.log('AuthProvider: Calling getSession...');
        supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('AuthProvider: getSession successful. isMounted:', isMounted);
            if (isMounted) {
                console.log('AuthProvider: Initial session data:', session);
                setSession(session);
                const supaUser = session?.user ?? null;
                setUser(supaUser ? {
                  ...supaUser,
                  plan: supaUser.user_metadata?.plan || 'free',
                  avatarUrl: supaUser.user_metadata?.avatar_url || ''
                } : null);
                console.log('AuthProvider: ---> Calling setLoading(false) from getSession success.');
                setLoading(false);
            }
        }).catch(err => {
            console.error("Error getting initial session:", err);
            console.log('AuthProvider: getSession failed. isMounted:', isMounted);
            if (isMounted) {
                console.log('AuthProvider: ---> Calling setLoading(false) from getSession error.');
                setLoading(false);
            }
        });

        // Listen for auth state changes
        console.log('AuthProvider: Setting up onAuthStateChange listener.');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                console.log('AuthProvider: onAuthStateChange fired. isMounted:', isMounted, 'Event:', _event);
                if (isMounted) {
                    console.log('AuthProvider: Auth state changed details:', _event, session);
                    setSession(session);
                    const supaUser2 = session?.user ?? null;
                    setUser(supaUser2 ? {
                      ...supaUser2,
                      plan: supaUser2.user_metadata?.plan || 'free',
                      avatarUrl: supaUser2.user_metadata?.avatar_url || ''
                    } : null);

                    // === Add localStorage logic here ===
                    if (session && session.access_token) {
                        console.log('AuthProvider: Saving auth_token to localStorage.');
                        localStorage.setItem('auth_token', session.access_token);
                        // Optionally save other useful info
                        // localStorage.setItem('refresh_token', session.refresh_token);
                        // localStorage.setItem('user', JSON.stringify(session.user));
                    } else {
                        console.log('AuthProvider: Removing auth_token from localStorage.');
                        localStorage.removeItem('auth_token');
                        // localStorage.removeItem('refresh_token');
                        // localStorage.removeItem('user');
                    }
                    // === End of localStorage logic ===

                    if (_event === 'SIGNED_OUT') {
                         console.log('AuthProvider: SIGNED_OUT detected, navigating to /login');
                         // localStorage removal is handled above
                         navigate('/login');
                    } else if (_event === 'SIGNED_IN') {
                         console.log('AuthProvider: SIGNED_IN detected. Navigation on initial load is handled by ProtectedRoute after loading completes.');
                         // localStorage saving is handled above
                         // navigate('/'); // Commented out: Let ProtectedRoute handle access after initial load based on loading state
                    } else if (_event === 'TOKEN_REFRESHED') {
                        console.log('AuthProvider: TOKEN_REFRESHED detected.');
                        // localStorage saving is handled above
                    }
                }
            }
        );

        // Cleanup subscription on unmount
        return () => {
            console.log('AuthProvider: useEffect cleanup running. Setting isMounted to false.');
            isMounted = false;
            if (subscription && subscription.unsubscribe) {
                 console.log('AuthProvider: Unsubscribing from onAuthStateChange.');
                 subscription.unsubscribe();
            }
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Login function - Remove navigation from here
    const handleLogin = async (email, password) => {
        console.log('AuthProvider: handleLogin started.');
        setLoading(true); 
        try {
            const response = await supabase.auth.signInWithPassword({ email, password });
            console.log('AuthProvider: Backend login response: ', response.data);
            // SUCCESS: onAuthStateChange listener will handle state update and navigation
            console.log('AuthProvider: ---> Calling setLoading(false) after successful backend login (though onAuthStateChange might handle it too).');
            setLoading(false); 
            return { success: true };
        } catch (error) {
            console.log('AuthProvider: ---> Calling setLoading(false) after failed backend login.');
            setLoading(false);
            console.error('AuthProvider: Login failed:', error);
            return { success: false, error: error.response?.data?.message || error.message || 'Login failed' };
        }
    };

     // Register function - similar to login
    const handleRegister = async (name, email, password, companyName = '') => {
        console.log('AuthProvider: handleRegister started.');
        setLoading(true);
        try {
            // Split name into first and last name
            const nameParts = name.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Call backend API with the updated fields
            const response = await supabase.auth.signUp({
                email, 
                password, 
                firstName, 
                lastName,
                options: {
                    data: {
                        companyName: companyName // Use passed company name or default to empty
                    }
                }
            });
            
            console.log('AuthProvider: Backend register response:', response.data);
            // Depending on Supabase email confirmation settings, user might not be logged in immediately.
            // onAuthStateChange might fire later or not at all until confirmed.
            console.log('AuthProvider: ---> Calling setLoading(false) after backend register attempt.');
            setLoading(false);
            // Inform user about potential email confirmation
            alert(response.data.message || 'Registration submitted. Check email if confirmation is needed.')
            navigate('/login'); // Redirect to login after registration attempt
            return { success: true };
        } catch (error) {
            console.log('AuthProvider: ---> Calling setLoading(false) after failed backend register.');
            setLoading(false);
            console.error('AuthProvider: Registration failed:', error);
            return { success: false, error: error.response?.data?.message || error.message || 'Registration failed' };
        }
    };

    // Logout function
    const handleLogout = async () => {
        console.log('AuthProvider: handleLogout started.');
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('AuthProvider: Error logging out:', error);
            // Still clear state locally even if Supabase call fails?
        }
        // onAuthStateChange will handle setting state to null/false and redirecting
        console.log('AuthProvider: ---> Calling setLoading(false) after signOut attempt (onAuthStateChange handles actual state clear).');
        setLoading(false);
    };

    // Google Sign In
    const signInWithGoogle = async () => {
         console.log('AuthProvider: signInWithGoogle started.');
         setLoading(true);
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            // options: {
            //     redirectTo: 'http://localhost:3001/auth/callback' // Optional: specify frontend callback
            // }
        });
         // setLoading(false); // Stop loading after initiating redirect - Let onAuthStateChange handle it
         // Correction: setLoading should maybe be set to false here if the redirect takes time or fails?
         // Let's keep it true for now, assuming redirect is fast and onAuthStateChange will fire.
        if (error) {
            console.error('AuthProvider: Error signing in with Google:', error);
             console.log('AuthProvider: ---> Calling setLoading(false) after Google sign-in error.');
             setLoading(false); // Set loading false on error
            alert('Google sign-in failed: ' + error.message);
        }
         console.log("AuthProvider: Google sign in initiated, redirect data:", data);
        // Supabase library handles the redirect
    };

    // Update user subscription plan via Supabase user_metadata
    const updatePlan = async (newPlan) => {
      try {
        const { error } = await supabase.auth.updateUser({ data: { plan: newPlan } });
        if (error) throw error;
        setUser(prev => ({ ...prev, plan: newPlan }));
        return { success: true };
      } catch (err) {
        console.error('AuthProvider: updatePlan failed:', err);
        return { success: false, error: err };
      }
    };

    // Value provided to context consumers
    const value = {
        session,
        user,
        isAuthenticated: !!user,
        loading,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        signInWithGoogle,
        updatePlan,
    };

    console.log('AuthProvider: Providing context value:', { session: !!session, user: !!user, isAuthenticated: value.isAuthenticated, loading });

    return (
        <AuthContext.Provider value={value}>
             {children} 
        </AuthContext.Provider>
    );
};

// Custom Hook to use Auth Context
export const useAuth = () => {
    return useContext(AuthContext);
}; 