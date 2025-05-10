import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot } from '@fortawesome/free-solid-svg-icons';
import { faTwitter, faLinkedin, faFacebook, faInstagram } from '@fortawesome/free-brands-svg-icons';
// import './Footer.css'; // If specific styles are needed

function Footer() {
    return (
        <footer>
            <div className="footer-content">
                <div className="footer-column">
                    <div className="logo"><FontAwesomeIcon icon={faRobot} /> ChatBotAI</div>
                    <p>Building the future of conversational AI for businesses of all sizes.</p>
                    <div className="social-links">
                        {/* Use <a> tags for now */}
                        <a href="#!"><FontAwesomeIcon icon={faTwitter} /></a>
                        <a href="#!"><FontAwesomeIcon icon={faLinkedin} /></a>
                        <a href="#!"><FontAwesomeIcon icon={faFacebook} /></a>
                        <a href="#!"><FontAwesomeIcon icon={faInstagram} /></a>
                    </div>
                </div>
                <div className="footer-column">
                    <h3>Products</h3>
                    <ul>
                        <li><a href="#!">Visual Builder</a></li>
                        <li><a href="#!">Analytics Dashboard</a></li>
                        <li><a href="#!">AI Templates</a></li>
                        <li><a href="#!">API Access</a></li>
                    </ul>
                </div>
                <div className="footer-column">
                    <h3>Resources</h3>
                    <ul>
                        <li><a href="#!">Documentation</a></li>
                        <li><a href="#!">Blog</a></li>
                        <li><a href="#!">Tutorials</a></li>
                        <li><a href="#!">Case Studies</a></li>
                    </ul>
                </div>
                <div className="footer-column">
                    <h3>Company</h3>
                    <ul>
                        <li><a href="#!">About Us</a></li>
                        <li><a href="#!">Careers</a></li>
                        <li><a href="#!">Contact</a></li>
                        <li><a href="#!">Press Kit</a></li>
                    </ul>
                </div>
            </div>
            <div className="copyright">
                <p>© {new Date().getFullYear()} ChatBotAI Platform. All rights reserved.</p> 
                {/* Dynamically set the year */}
            </div>
        </footer>
    );
}

export default Footer; 