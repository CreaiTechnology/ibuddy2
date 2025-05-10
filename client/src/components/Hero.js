import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faPlayCircle } from '@fortawesome/free-solid-svg-icons';
// Optional: Import a specific CSS file if needed
// import './Hero.css';

function Hero() {
    return (
        <section className="hero">
            <div className="hero-content">
                <h1>Build Powerful AI Chatbots</h1>
                <p>Create automated chat flows without coding, engage customers 24/7 and boost conversions with our intuitive platform</p>
                <div className="hero-buttons">
                    <button className="btn btn-primary btn-large">
                        Start Free Trial <FontAwesomeIcon icon={faArrowRight} />
                    </button>
                    <button className="btn btn-outline">
                        <FontAwesomeIcon icon={faPlayCircle} /> Watch Demo
                    </button>
                </div>
            </div>
            <div className="hero-image">
                {/* Using an external image for now */}
                <img src="https://cdn.dribbble.com/users/1418633/screenshots/16698857/media/08cb6d1bc0f89d911ce6448118d216eb.png" alt="ChatBot Platform Interface" />
            </div>
        </section>
    );
}

export default Hero; 