import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faBars } from '@fortawesome/free-solid-svg-icons';
import UserMenu from './UserMenu';
// We might create a separate CSS file for Navbar later if needed
// import './Navbar.css'; 

function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const { isAuthenticated } = useAuth();

    // Effect to handle navbar scroll changes
    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 50;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        document.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            // Cleanup the event listener on component unmount
            document.removeEventListener('scroll', handleScroll);
        };
    }, [scrolled]); // Re-run effect only if scrolled state changes

    return (
        <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="logo">
                <FontAwesomeIcon icon={faRobot} />
                <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>ChatBotAI</Link> {/* Changed color to inherit */} 
            </div>
            <div className="nav-links">
                {/* Use Link component for internal navigation */}
                <Link to="/">Home</Link>
                <a href="#!">Solutions</a> {/* Replaced # with #! */}
                <a href="#!">Pricing</a> {/* Replaced # with #! */}
                <a href="#!">Resources</a> {/* Replaced # with #! */}
                {/* Note: The Dashboard link below might need adjustment if '/dashboard' route doesn't exist yet */}
                {isAuthenticated && <Link to="/dashboard">Dashboard</Link>} 
                <a href="#!">About</a> {/* Replaced # with #! */}
            </div>
            <div className="nav-buttons">
                {isAuthenticated ? (
                    <UserMenu />
                ) : (
                    <>
                        <Link to="/login" className="btn btn-outline">Login</Link>
                        <Link to="/register" className="btn btn-primary">Get Started</Link>
                    </>
                )}
            </div>
            <div className="mobile-menu">
                {/* Add logic for mobile menu toggle later */}
                <FontAwesomeIcon icon={faBars} />
            </div>
        </nav>
    );
}

export default Navbar; 